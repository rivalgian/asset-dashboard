# Asset Management Dashboard

Dashboard inventaris berbasis Next.js + PostgreSQL. Project ini sudah disesuaikan dengan `database.xlsx` berisi 379 aset.

## Fitur
- KPI total asset, product model, processor, dan brand
- Grafik top product model
- Grafik top processor
- Search seluruh data
- Filter model dan processor
- Pagination
- PostgreSQL sebagai database
- Import Excel sekali perintah

## 1. Install
Pastikan Node.js 20+ dan Docker Desktop sudah terpasang.

```bash
npm install
```

## 2. Jalankan PostgreSQL

```bash
docker compose up -d
```

## 3. Buat environment

Salin `.env.local.example` menjadi `.env.local`.

Windows CMD:
```cmd
copy .env.local.example .env.local
```

PowerShell:
```powershell
Copy-Item .env.local.example .env.local
```

Isi default:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/asset_dashboard
```

## 4. Import Excel

Pastikan `database.xlsx` berada di folder utama project, lalu:

```bash
npm run import
```

Output yang diharapkan:
```text
Import selesai: 379 aset berhasil dimasukkan.
```

## 5. Jalankan dashboard

```bash
npm run dev
```

Buka:
http://localhost:3000

## Jika Anda memiliki Excel baru
Ganti `database.xlsx` dengan file baru yang memiliki lima header:
- Asset - Asset#
- Asset - Product Model Number
- Asset - Asset Identification Number
- Asset - Processor
- Asset - Serial Number

Lalu jalankan:
```bash
npm run import
```

Data lama akan diganti dengan data Excel terbaru.
