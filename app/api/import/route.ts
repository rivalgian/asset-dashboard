
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

const REQUIRED_HEADERS = [
  "Asset - Asset#",
  "Asset - Product Model Number",
  "Asset - Asset Identification Number",
  "Asset - Processor",
  "Asset - Serial Number"
];

function normalizeHeader(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(request: Request) {
  const user = await getSession();

  if (!user) {
    return NextResponse.json(
      { error: "Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang boleh mengimpor Excel." },
      { status: 403 }
    );
  }

  const client = await pool.connect();

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Pilih file Excel terlebih dahulu." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "File harus berformat .xlsx." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file harus lebih dari 0 dan maksimal 10 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      return NextResponse.json(
        { error: "Worksheet Excel tidak ditemukan." },
        { status: 400 }
      );
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      sheet,
      { defval: "" }
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Excel tidak memiliki data." },
        { status: 400 }
      );
    }

    const actualHeaders = Object.keys(rows[0]);
    const headerLookup = new Map(
      actualHeaders.map((header) => [
        normalizeHeader(header),
        header
      ])
    );

    const missingHeaders = REQUIRED_HEADERS.filter(
      (header) => !headerLookup.has(normalizeHeader(header))
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: "Kolom Excel tidak sesuai.",
          missingHeaders
        },
        { status: 400 }
      );
    }

    const column = (row: Record<string, unknown>, name: string) =>
      row[headerLookup.get(normalizeHeader(name))!];

    const assets = [];
    const assetIds = new Set<string>();
    const serialNumbers = new Set<string>();
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const excelRow = i + 2;

      const assetNumberText = normalizeText(
        column(row, "Asset - Asset#")
      );
      const assetNumber = Number(assetNumberText);

      const productModel = normalizeText(
        column(row, "Asset - Product Model Number")
      );
      const assetId = normalizeText(
        column(row, "Asset - Asset Identification Number")
      );
      const processor = normalizeText(
        column(row, "Asset - Processor")
      );
      const serialNumber = normalizeText(
        column(row, "Asset - Serial Number")
      );

      if (
        !assetNumberText ||
        !Number.isSafeInteger(assetNumber) ||
        assetNumber < 0 ||
        !productModel ||
        !assetId ||
        !processor ||
        !serialNumber
      ) {
        errors.push(
          `Baris ${excelRow}: ada kolom wajib kosong atau Asset# tidak valid.`
        );
        continue;
      }

      if (assetIds.has(assetId)) {
        errors.push(
          `Baris ${excelRow}: Asset Identification Number duplikat (${assetId}).`
        );
        continue;
      }

      if (serialNumbers.has(serialNumber)) {
        errors.push(
          `Baris ${excelRow}: Serial Number duplikat (${serialNumber}).`
        );
        continue;
      }

      assetIds.add(assetId);
      serialNumbers.add(serialNumber);

      assets.push({
        assetNumber,
        productModel,
        assetId,
        processor,
        serialNumber
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Import dibatalkan karena data Excel bermasalah.",
          totalRows: rows.length,
          errors: errors.slice(0, 20),
          moreErrors: Math.max(0, errors.length - 20)
        },
        { status: 400 }
      );
    }

    if (assets.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data aset yang valid." },
        { status: 400 }
      );
    }

    await client.query("BEGIN");

    await client.query("LOCK TABLE assets IN ACCESS EXCLUSIVE MODE");

    await client.query("TRUNCATE TABLE assets RESTART IDENTITY");

    for (const asset of assets) {
      await client.query(
        `INSERT INTO assets
          (asset_number, product_model, asset_identification_number,
           processor, serial_number)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          asset.assetNumber,
          asset.productModel,
          asset.assetId,
          asset.processor,
          asset.serialNumber
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Data aset berhasil diperbarui.",
      imported: assets.length
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Excel import error:", error);

    return NextResponse.json(
      { error: "Import gagal. Data lama tetap dipertahankan." },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
