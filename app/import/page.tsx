
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    async function checkUser() {
      try {
        const response = await fetch("/api/auth/me");

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          setError("Gagal memeriksa akun.");
          return;
        }

        const data = await response.json();

        if (data.user?.role !== "admin") {
          router.replace("/");
          return;
        }
      } catch {
        setError("Tidak dapat memeriksa status login.");
      } finally {
        setChecking(false);
      }
    }

    checkUser();
  }, [router]);

  async function handleUpload() {
    if (!file || loading) return;

    const confirmed = window.confirm(
      "PERINGATAN: Seluruh data aset lama akan diganti dengan isi Excel ini. Pastikan file memuat semua aset yang ingin dipertahankan. Lanjutkan?"
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");
    setSuccess("");
    setDetails([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Import gagal.");
        setDetails([
          ...(data.missingHeaders || []).map(
            (x: string) => `Kolom tidak ditemukan: ${x}`
          ),
          ...(data.errors || [])
        ]);
        return;
      }

      setSuccess(
        `${data.imported} aset berhasil diimpor.`
      );
      setFile(null);

      const input = document.getElementById(
        "excel-file"
      ) as HTMLInputElement | null;

      if (input) input.value = "";
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="shell">
        <section className="content">
          <p>Memeriksa akses...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandIcon">A</div>
          <div>
            <strong>AssetHub</strong>
            <span>Management System</span>
          </div>
        </div>

        <nav>
          <a href="/">Overview</a>
          <a href="/users">User Management</a>
          <a className="active" href="/import">
            Upload Excel
          </a>
        </nav>

        <div className="sideNote">
          <span>DATA IMPORT</span>
          <small>Update asset inventory</small>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              INVENTORY / DATA IMPORT
            </p>
            <h1>Upload Excel</h1>
            <p className="subtitle">
              Perbarui data aset dari file Excel
            </p>
          </div>
        </header>

        <section className="panel importPanel">
          <div className="importIcon">↑</div>
          <h2>Import Asset Data</h2>
          <p className="subtitle">
            Pilih file Excel terbaru untuk mengganti
            data aset di database.
          </p>

          <label
            className="filePicker"
            htmlFor="excel-file"
          >
            <strong>
              {file ? file.name : "Pilih file Excel"}
            </strong>
            <span>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : "Format .xlsx · Maksimal 10 MB"}
            </span>
          </label>

          <input
            id="excel-file"
            type="file"
            accept=".xlsx"
            hidden
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError("");
              setSuccess("");
              setDetails([]);
            }}
          />

          <div className="importWarning">
            <strong>Perhatian</strong>
            <p>
              Import akan mengganti seluruh data aset
              yang lama. Data user dan akun login tidak
              ikut dihapus.
            </p>
          </div>

          {error && (
            <div className="error importMessage">
              {error}
              {details.length > 0 && (
                <ul>
                  {details.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {success && (
            <div className="success importMessage">
              {success}
            </div>
          )}

          <button
            className="addBtn importButton"
            disabled={!file || loading}
            onClick={handleUpload}
          >
            {loading ? "Mengimpor data..." : "Upload & Update"}
          </button>

          <div className="importFormat">
            <strong>Kolom wajib dalam Excel</strong>
            <ul>
              <li>Asset - Asset#</li>
              <li>Asset - Product Model Number</li>
              <li>Asset - Asset Identification Number</li>
              <li>Asset - Processor</li>
              <li>Asset - Serial Number</li>
            </ul>
          </div>

          {success && (
            <button
              className="ghost importBack"
              onClick={() => {
                router.push("/");
                router.refresh();
              }}
            >
              Kembali ke Dashboard
            </button>
          )}
        </section>
      </section>
    </main>
  );
}
