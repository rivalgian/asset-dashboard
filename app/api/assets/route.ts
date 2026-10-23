import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = (searchParams.get("q") ?? "").trim();
    const model = (searchParams.get("model") ?? "").trim();
    const processor = (searchParams.get("processor") ?? "").trim();
    const status = (searchParams.get("status") ?? "").trim().toUpperCase();

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(
      100,
      Math.max(10, Number(searchParams.get("limit") ?? 20))
    );

    const offset = (page - 1) * limit;

    const params: string[] = [];
    const where: string[] = [];

    if (q) {
      params.push(`%${q}%`);

      where.push(`(
        product_model ILIKE $${params.length}
        OR asset_identification_number ILIKE $${params.length}
        OR processor ILIKE $${params.length}
        OR serial_number ILIKE $${params.length}
        OR status ILIKE $${params.length}
      )`);
    }

    if (model) {
      params.push(model);
      where.push(`product_model = $${params.length}`);
    }

    if (processor) {
      params.push(processor);
      where.push(`processor = $${params.length}`);
    }

    if (["USED", "IDLE", "ERROR"].includes(status)) {
  params.push(status);
  where.push(`UPPER(status) = $${params.length}`);
}

    const whereSql = where.length
      ? `WHERE ${where.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM assets
       ${whereSql}`,
      params
    );

    const total = countResult.rows[0]?.count ?? 0;

    const dataParams = [...params, String(limit), String(offset)];

    const dataResult = await pool.query(
      `SELECT
        id,
        asset_number AS "assetNumber",
        product_model AS "productModel",
        asset_identification_number AS "assetIdentificationNumber",
        processor,
        serial_number AS "serialNumber",
        status
       FROM assets
       ${whereSql}
       ORDER BY asset_number ASC
       LIMIT $${dataParams.length - 1}
       OFFSET $${dataParams.length}`,
      dataParams
    );

    return NextResponse.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal mengambil data asset." },
      { status: 500 }
    );
  }
}


// POST - TAMBAH ASSET
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      assetNumber,
      productModel,
      assetIdentificationNumber,
      processor,
      serialNumber
    } = body;

    if (
      !assetNumber ||
      !productModel ||
      !assetIdentificationNumber ||
      !processor ||
      !serialNumber
    ) {
      return NextResponse.json(
        { error: "Semua field wajib diisi." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO assets
      (
        asset_number,
        product_model,
        asset_identification_number,
        processor,
        serial_number
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        asset_number AS "assetNumber",
        product_model AS "productModel",
        asset_identification_number AS "assetIdentificationNumber",
        processor,
        serial_number AS "serialNumber"`,
      [
        assetNumber,
        productModel,
        assetIdentificationNumber,
        processor,
        serialNumber
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {

    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Asset ID atau Serial Number sudah digunakan."
        },
        { status: 409 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Gagal menambahkan asset." },
      { status: 500 }
    );
  }
}


// PUT - EDIT ASSET
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      assetNumber,
      productModel,
      assetIdentificationNumber,
      processor,
      serialNumber,
      status
    } = body;

    
const normalizedStatus = String(status ?? "").trim().toUpperCase();

if (!["USED", "IDLE", "ERROR"].includes(normalizedStatus)) {
  return NextResponse.json(
    { error: "Status harus USED, IDLE, atau ERROR." },
    { status: 400 }
  );
}

const result = await pool.query(
  `UPDATE assets
   SET
     asset_number = $1,
     product_model = $2,
     asset_identification_number = $3,
     processor = $4,
     serial_number = $5,
     status = $6
   WHERE id = $7
   RETURNING
     id,
     asset_number AS "assetNumber",
     product_model AS "productModel",
     asset_identification_number AS "assetIdentificationNumber",
     processor,
     serial_number AS "serialNumber",
     status`,
  [
    assetNumber,
    productModel,
    assetIdentificationNumber,
    processor,
    serialNumber,
    normalizedStatus,
    id
  ]
);


    if (!result.rowCount) {
      return NextResponse.json(
        { error: "Asset tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error: any) {

    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Asset ID atau Serial Number sudah digunakan."
        },
        { status: 409 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Gagal mengubah asset." },
      { status: 500 }
    );
  }
}


// DELETE - HAPUS ASSET
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID asset tidak ditemukan." },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `DELETE FROM assets
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { error: "Asset tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Gagal menghapus asset." },
      { status: 500 }
    );
  }
}