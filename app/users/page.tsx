"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: number;
  username: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
};

type FormData = {
  username: string;
  email: string;
  password: string;
  role: "admin" | "user";
};

const emptyForm: FormData = {
  username: "",
  email: "",
  password: "",
  role: "user"
};

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<FormData>(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);

      const response = await fetch("/api/users");

      const data = await response.json();

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (response.status === 403) {
        router.replace("/");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengambil user.");
      }

      setUsers(data.data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal mengambil user."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openModal() {
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setForm(emptyForm);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal membuat user."
        );
      }

      setShowModal(false);
      setForm(emptyForm);

      setSuccess(
        `Akun ${data.user.username} berhasil dibuat.`
      );

      await loadUsers();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal membuat user."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(user: User) {
    const newRole =
      user.role === "admin"
        ? "user"
        : "admin";

    const confirmed = window.confirm(
      `Ubah role ${user.username} menjadi ${newRole.toUpperCase()}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: user.id,
          role: newRole
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal mengubah role."
        );
      }

      setSuccess(
        `Role ${user.username} berhasil diubah.`
      );

      await loadUsers();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal mengubah role."
      );
    }
  }

  async function deleteUser(user: User) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus akun "${user.username}"?\n\nData akun ini akan dihapus permanen.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/users?id=${user.id}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Gagal menghapus user."
        );
      }

      setSuccess(
        `Akun ${user.username} berhasil dihapus.`
      );

      await loadUsers();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus user."
      );
    }
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
          <a href="/">
            Overview
          </a>

          <a className="active">
            User Management
          </a>
        </nav>

        <div className="sideNote">
          <span>ADMINISTRATION</span>
          <small>Manage dashboard accounts</small>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              ADMINISTRATION / USERS
            </p>

            <h1>User Management</h1>

            <p className="subtitle">
              PT. Accord Innovations Indonesia
            </p>
          </div>

          <button
            className="addBtn"
            onClick={openModal}
          >
            + Tambah User
          </button>
        </header>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {success && (
          <div className="success">
            {success}
          </div>
        )}

        <section className="panel userPanel">
          <div className="tableHead">
            <div>
              <h2>Daftar Pengguna</h2>

              <p>
                {users.length} akun terdaftar
              </p>
            </div>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Dibuat</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="empty"
                    >
                      Memuat user...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="empty"
                    >
                      Belum ada user.
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id}>
                      <td className="muted">
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {user.username}
                        </strong>
                      </td>

                      <td>
                        {user.email}
                      </td>

                      <td>
                        <button
                          className={
                            user.role === "admin"
                              ? "roleAdmin"
                              : "roleUser"
                          }
                          onClick={() =>
                            changeRole(user)
                          }
                        >
                          {user.role.toUpperCase()}
                        </button>
                      </td>

                      <td className="muted">
                        {new Date(
                          user.created_at
                        ).toLocaleDateString(
                          "id-ID"
                        )}
                      </td>

                      <td>
                        <button
                          className="deleteBtn"
                          onClick={() =>
                            deleteUser(user)
                          }
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {showModal && (
        <div className="modalOverlay">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <h2>Tambah User</h2>
                <p>
                  Buat akun baru untuk dashboard
                </p>
              </div>

              <button
                className="closeBtn"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="formGrid">
                <div className="formGroup">
                  <label>Username</label>

                  <input
                    value={form.username}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        username: e.target.value
                      })
                    }
                    placeholder="contoh: budi"
                    required
                  />
                </div>

                <div className="formGroup">
                  <label>Email</label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value
                      })
                    }
                    placeholder="budi@email.com"
                    required
                  />
                </div>

                <div className="formGroup">
                  <label>Password</label>

                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value
                      })
                    }
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                    required
                  />
                </div>

                <div className="formGroup">
                  <label>Role</label>

                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        role:
                          e.target.value === "admin"
                            ? "admin"
                            : "user"
                      })
                    }
                  >
                    <option value="user">
                      User
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="loginError">
                  {error}
                </div>
              )}

              <div className="modalFooter">
                <button
                  type="button"
                  className="ghost"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="saveBtn"
                  disabled={saving}
                >
                  {saving
                    ? "Membuat..."
                    : "Buat Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}