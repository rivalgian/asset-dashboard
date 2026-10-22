"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";



type Asset = {
  id: number;
  assetNumber: number;
  productModel: string;
  assetIdentificationNumber: string;
  processor: string;
  serialNumber: string;
  status: "USED" | "IDLE" | "ERROR";
};

type Stats = {
  summary: {
    total: number;
    models: number;
    processors: number;
    brands: number;
  };
  models: { name: string; value: number }[];
  processors: { name: string; value: number }[];
  brands: { name: string; value: number }[];
};

type FormData = {
  assetNumber: string;
  productModel: string;
  assetIdentificationNumber: string;
  processor: string;
  serialNumber: string;
};

const emptyForm: FormData = {
  assetNumber: "",
  productModel: "",
  assetIdentificationNumber: "",
  processor: "",
  serialNumber: "",
};

const chartColors = [
  "#6d8cff",
  "#43c6a8",
  "#f5b85b",
  "#e8758a",
  "#9b7bea",
  "#4db6d9",
  "#ef8d5e",
  "#7bc96f",
];

export default function Dashboard() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [q, setQ] = useState("");
  const [model, setModel] = useState("");
  const [processor, setProcessor] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function handleLogout() {
  await fetch("/api/auth/logout", {
    method: "POST"
  });

  router.replace("/login");
  router.refresh();
  }

  // =========================
  // LOAD STATISTICS
  // =========================

  const loadStats = async () => {
    try {
      const response = await fetch("/api/stats");

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setStats(data);
    } catch {
      setError("Tidak dapat mengambil statistik database.");
    }
  };

  // =========================
  // LOAD ASSETS
  // =========================

  const loadAssets = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        q,
        model,
        processor,
        status,
      });

      const response = await fetch(`/api/assets?${params}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil data.");
      }

      setAssets(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || "Gagal mengambil data asset.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadAssets();
  }, [q, model, processor, status, page]);

  // =========================
  // FILTER
  // =========================

  const clearFilters = () => {
    setQ("");
    setModel("");
    setProcessor("");
    setStatus("");
    setPage(1);
  };

  // =========================
  // OPTIONS
  // =========================

  const modelOptions = useMemo(
    () => stats?.models.map((x) => x.name) ?? [],
    [stats]
  );

  const processorOptions = useMemo(
    () => stats?.processors.map((x) => x.name) ?? [],
    [stats]
  );

  // =========================
  // OPEN ADD
  // =========================

  const openAddModal = () => {
    setEditingAsset(null);

    setForm({
      ...emptyForm,
      assetNumber: String((stats?.summary.total ?? 0) + 1),
    });

    setShowModal(true);
  };

  // =========================
  // OPEN EDIT
  // =========================

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);

    setForm({
      assetNumber: String(asset.assetNumber),
      productModel: asset.productModel,
      assetIdentificationNumber: asset.assetIdentificationNumber,
      processor: asset.processor,
      serialNumber: asset.serialNumber,
    });

    setShowModal(true);
  };

  // =========================
  // CLOSE MODAL
  // =========================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingAsset(null);
    setForm(emptyForm);
  };

  // =========================
  // FORM CHANGE
  // =========================

  const updateForm = (
    field: keyof FormData,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // =========================
  // SAVE ASSET
  // =========================

  const handleSave = async () => {
    if (
      !form.assetNumber ||
      !form.productModel ||
      !form.assetIdentificationNumber ||
      !form.processor ||
      !form.serialNumber
    ) {
      alert("Semua field wajib diisi.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        assetNumber: Number(form.assetNumber),
        productModel: form.productModel.trim(),
        assetIdentificationNumber:
          form.assetIdentificationNumber.trim(),
        processor: form.processor.trim(),
        serialNumber: form.serialNumber.trim(),
      };

      const response = await fetch("/api/assets", {
        method: editingAsset ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingAsset
            ? {
                id: editingAsset.id,
                ...payload,
              }
            : payload
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal menyimpan asset."
        );
      }

      closeModal();

      await Promise.all([
        loadAssets(),
        loadStats(),
      ]);

    } catch (err: any) {
      alert(err.message || "Gagal menyimpan asset.");
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // DELETE ASSET
  // =========================

  const handleDelete = async (asset: Asset) => {
    const confirmed = window.confirm(
      `Hapus asset berikut?\n\n` +
        `${asset.productModel}\n` +
        `${asset.assetIdentificationNumber}\n` +
        `${asset.serialNumber}\n\n` +
        `Data yang dihapus tidak dapat dikembalikan.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/assets?id=${asset.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal menghapus asset."
        );
      }

      await Promise.all([
        loadAssets(),
        loadStats(),
      ]);

    } catch (err: any) {
      alert(err.message || "Gagal menghapus asset.");
    }
  };

  return (
    <main className="shell">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        <div className="brand">

          <div className="brandIcon">
            A
          </div>

          <div>
            <strong>AssetHub</strong>

            <span>
              Management System
            </span>
          </div>

        </div>

        <nav>

          <a className="active">
            Overview
          </a>
          
           <a href="/import">
            Upload Excel
          </a>

          <a href="/users">
            User Management
          </a>

        </nav>

        <div className="sideNote">

          <span>DATABASE</span>

          <strong>
            PostgreSQL
          </strong>

          <small>
            Live inventory data
          </small>

          <button
            className="logoutBtn"
             onClick={handleLogout}
            >
          Logout
        </button> 

        </div>

      </aside>

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <section className="content">

        {/* HEADER */}

        <header className="topbar">

          <div>

            <p className="eyebrow">
              INVENTORY / OVERVIEW
            </p>

            <h1>
              Asset Dashboard
            </h1>

            <p className="subtitle">
              PT. Accord Innovations Indonesia
            </p>

          </div>

          <div className="status">
            <i />
            connected
          </div>

        </header>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* =========================
            KPI
        ========================= */}

        <section className="cards">

          <Kpi
            title="Total Assets"
            value={stats?.summary.total ?? "—"}
            icon="▣"
          />

          <Kpi
            title="Product Models"
            value={stats?.summary.models ?? "—"}
            icon="▤"
          />

          <Kpi
            title="Processors"
            value={stats?.summary.processors ?? "—"}
            icon="◈"
          />

          <Kpi
            title="Brands"
            value={stats?.summary.brands ?? "—"}
            icon="◆"
          />

        </section>

        {/* =========================
            CHARTS
        ========================= */}

        <section className="charts">

          {/* PRODUCT MODEL */}

          <div className="panel">

            <div className="panelHead">

              <div>

                <h2>
                  Top Product Models
                </h2>

                <p>
                  Model dengan jumlah aset terbanyak
                </p>

              </div>

            </div>

            <div className="chart">

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart
                  data={stats?.models ?? []}
                  layout="vertical"
                  margin={{
                    left: 15,
                    right: 15,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.15}
                  />

                  <XAxis
                    type="number"
                    stroke="#7f8aa3"
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={145}
                    stroke="#7f8aa3"
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#121826",
                      border: "1px solid #273149",
                      borderRadius: 10,
                    }}
                  />

                  <Bar
                    dataKey="value"
                    name="Assets"
                    radius={[
                      0,
                      5,
                      5,
                      0,
                    ]}
                    fill="#6d8cff"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* PROCESSOR */}

          <div className="panel">

            <div className="panelHead">

              <div>

                <h2>
                  Top Processors
                </h2>

                <p>
                  Distribusi processor
                </p>

              </div>

            </div>

            <div className="chart">

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <BarChart
                  data={stats?.processors ?? []}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -10,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.15}
                  />

                  <XAxis
                    dataKey="name"
                    stroke="#7f8aa3"
                    tick={{
                      fontSize: 10,
                    }}
                    angle={-35}
                    textAnchor="end"
                    height={75}
                  />

                  <YAxis
                    stroke="#7f8aa3"
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#121826",
                      border: "1px solid #273149",
                      borderRadius: 10,
                    }}
                  />

                  <Bar
                    dataKey="value"
                    name="Assets"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                    fill="#43c6a8"
                  />

                </BarChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* =========================
              BRAND CHART
          ========================= */}

          <div className="panel">

            <div className="panelHead">

              <div>

                <h2>
                  Asset by Brand
                </h2>

                <p>
                  Distribusi aset berdasarkan brand
                </p>

              </div>

            </div>

            <div className="chart">

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <PieChart>

                  <Pie
                    data={stats?.brands ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={2}
                    label
                  >

                    {(stats?.brands ?? []).map(
                      (_, index) => (
                        <Cell
                          key={index}
                          fill={
                            chartColors[
                              index %
                                chartColors.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#121826",
                      border:
                        "1px solid #273149",
                      borderRadius: 10,
                    }}
                  />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

          </div>

          {/* =========================
              PROCESSOR PIE
          ========================= */}

          <div className="panel">

            <div className="panelHead">

              <div>

                <h2>
                  Processor Distribution
                </h2>

                <p>
                  Persentase processor yang digunakan
                </p>

              </div>

            </div>

            <div className="chart">

              <ResponsiveContainer
                width="100%"
                height={300}
              >

                <PieChart>

                  <Pie
                    data={stats?.processors ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={55}
                    paddingAngle={2}
                  >

                    {(stats?.processors ?? []).map(
                      (_, index) => (
                        <Cell
                          key={index}
                          fill={
                            chartColors[
                              index %
                                chartColors.length
                            ]
                          }
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      background: "#121826",
                      border:
                        "1px solid #273149",
                      borderRadius: 10,
                    }}
                  />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            </div>

          </div>

        </section>

        {/* =========================
            ASSET TABLE
        ========================= */}

        <section className="panel tablePanel">

          <div className="tableHead">

            <div>

              <h2>
                Asset Inventory
              </h2>

              <p>
                {total} aset ditemukan
              </p>

            </div>

            <div className="tableActions">

              <button
                className="addBtn"
                onClick={openAddModal}
              >
                + Tambah Asset
              </button>

              <button
                className="ghost"
                onClick={clearFilters}
              >
                Reset Filter
              </button>

            </div>

          </div>

          {/* FILTER */}

          <div className="filters">

            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Cari model, asset ID, processor, serial..."
            />

            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setPage(1);
              }}
            >

              <option value="">
                Semua model
              </option>

              {modelOptions.map((x) => (
                <option
                  key={x}
                  value={x}
                >
                  {x}
                </option>
              ))}

            </select>

            <select
              value={processor}
              onChange={(e) => {
                setProcessor(e.target.value);
                setPage(1);
              }}
            >

              <option value="">
                Semua processor
              </option>

              {processorOptions.map((x) => (
                <option
                  key={x}
                  value={x}
                >
                  {x}
                </option>
              ))}

            </select>

            <select
  value={status}
  onChange={(e) => {
    setStatus(e.target.value);
    setPage(1);
  }}
>
  <option value="">Semua status</option>
  <option value="USED">USED</option>
  <option value="IDLE">IDLE</option>
  <option value="ERROR">ERROR</option>
</select>

          </div>

          {/* TABLE */}

          <div className="tableWrap">

            <table>

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    Product Model
                  </th>

                  <th>
                    Asset Identification
                  </th>

                  <th>
                    Processor
                  </th>

                  <th>
                    Serial Number
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {loading ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="empty"
                    >
                      Memuat data...
                    </td>

                  </tr>

                ) : assets.length === 0 ? (

                  <tr>

                    <td
                      colSpan={7}
                      className="empty"
                    >
                      Tidak ada aset yang cocok.
                    </td>

                  </tr>

                ) : (

                  assets.map((a) => (

                    <tr key={a.id}>

                      <td className="muted">
                        {a.assetNumber}
                      </td>

                      <td>
                        <strong>
                          {a.productModel}
                        </strong>
                      </td>

                      <td>
                        <code>
                          {a.assetIdentificationNumber}
                        </code>
                      </td>

                      <td>

                        <span className="chip">
                          {a.processor}
                        </span>

                      </td>

                      <td>

                        <code>
                          {a.serialNumber}
                        </code>

                      </td>

                      <td>
                      <span className={`statusBadge status-${a.status.toLowerCase()}`}>
                          {a.status}
                       </span>
                      </td>

                      <td>

                        <div className="actions">

                          <button
                            className="editBtn"
                            onClick={() =>
                              openEditModal(a)
                            }
                            title="Edit asset"
                          >
                            ✏️
                          </button>

                          <button
                            className="deleteBtn"
                            onClick={() =>
                              handleDelete(a)
                            }
                            title="Hapus asset"
                          >
                            🗑️
                          </button>

                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

          {/* PAGINATION */}

          <div className="pagination">

            <span>
              Halaman {page} dari {totalPages}
            </span>

            <div>

              <button
                disabled={page <= 1}
                onClick={() =>
                  setPage((p) => p - 1)
                }
              >
                ←
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((p) => p + 1)
                }
              >
                →
              </button>

            </div>

          </div>

        </section>

      </section>

      {/* =========================
          ADD / EDIT MODAL
      ========================= */}

      {showModal && (

        <div
          className="modalOverlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="modal">

            <div className="modalHeader">

              <div>

                <h2>
                  {editingAsset
                    ? "Edit Asset"
                    : "Tambah Asset"}
                </h2>

                <p>
                  {editingAsset
                    ? "Perbarui informasi asset."
                    : "Masukkan informasi asset baru."}
                </p>

              </div>

              <button
                className="closeBtn"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <div className="formGrid">

              <div className="formGroup">

                <label>
                  Asset #
                </label>

                <input
                  type="number"
                  value={form.assetNumber}
                  onChange={(e) =>
                    updateForm(
                      "assetNumber",
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="formGroup">

                <label>
                  Product Model Number
                </label>

                <input
                  value={form.productModel}
                  onChange={(e) =>
                    updateForm(
                      "productModel",
                      e.target.value
                    )
                  }
                  placeholder="Contoh: Lenovo ThinkPad T480"
                />

              </div>

              <div className="formGroup">

                <label>
                  Asset Identification Number
                </label>

                <input
                  value={
                    form.assetIdentificationNumber
                  }
                  onChange={(e) =>
                    updateForm(
                      "assetIdentificationNumber",
                      e.target.value
                    )
                  }
                  placeholder="Contoh: PTAI-020523-122"
                />

              </div>

              <div className="formGroup">

                <label>
                  Processor
                </label>

                <input
                  value={form.processor}
                  onChange={(e) =>
                    updateForm(
                      "processor",
                      e.target.value
                    )
                  }
                  placeholder="Contoh: i5-8350U"
                />

              </div>

              <div className="formGroup full">

                <label>
                  Serial Number
                </label>

                <input
                  value={form.serialNumber}
                  onChange={(e) =>
                    updateForm(
                      "serialNumber",
                      e.target.value
                    )
                  }
                  placeholder="Contoh: PF1PQ5VA"
                />

              </div>

            </div>

            <div className="modalFooter">

              <button
                className="ghost"
                onClick={closeModal}
                disabled={saving}
              >
                Batal
              </button>

              <button
                className="saveBtn"
                onClick={handleSave}
                disabled={saving}
              >

                {saving
                  ? "Menyimpan..."
                  : editingAsset
                  ? "Simpan Perubahan"
                  : "Tambah Asset"}

              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

// =========================
// KPI COMPONENT
// =========================

function Kpi({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="kpi">

      <div className="kpiIcon">
        {icon}
      </div>

      <div>

        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

      </div>

    </div>
  );
}
