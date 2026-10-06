# Kasir Laundry (POS)

Aplikasi kasir laundry khusus **pemilik (owner)**. Catat transaksi, terima pembayaran tunai (lunas, DP, atau bayar
nanti), cetak atau kirim struk via WhatsApp, pantau status cucian, dan baca laporan pendapatan.
Tidak memakai payment gateway.

### Alur DP
Pembayaran sebagian dicatat sebagai **DP** pada nota yang sama. Saat cucian diambil, buka **Pesanan → detail →
Pelunasan**. Struk nota yang sama langsung tampil lagi berisi baris DP, Pelunasan, dan status **LUNAS**.
Tidak perlu membuat transaksi atau nota baru.

- Backend: **Laravel 13** (REST API + Sanctum)
- Frontend: **Next.js 16** + React 19 + TypeScript + Tailwind CSS v4
- Database: **MySQL** (XAMPP)

Dokumen terkait: `PRD.md` (fitur) dan `SECURITY.md` (keamanan).

---

## Menjalankan

Pastikan **MySQL di XAMPP menyala**, lalu buka dua terminal.

**Terminal 1 — backend** (http://127.0.0.1:8000)

```bash
cd backend
composer install            # sekali saja, jika folder vendor belum ada
php artisan migrate:fresh --seed   # buat tabel + isi data contoh (MENGHAPUS data lama)
php artisan serve
```

Pengaturan database ada di `backend/.env` (`DB_DATABASE=laundry_db`, `DB_USERNAME=root`, password kosong).
Buat database `laundry_db` lewat phpMyAdmin bila belum ada.

**Terminal 2 — frontend** (http://localhost:3000)

```bash
cd frontend
npm install                 # sekali saja, jika folder node_modules belum ada
npm run dev
```

Alamat API diatur di `frontend/.env.local` (`NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api`).

---

## Akun Owner (data contoh)

| Email | Password |
|-------|----------|
| `owner@laundry.test` | `password` |

Ganti password ini dari menu **Pengaturan** sebelum dipakai sungguhan.

### Data contoh dari seeder

- Profil toko **Bersih Laundry** (Jl. Paris 2, Bansir Darat, Pontianak)
- **9 layanan**: Cuci Kering Lipat, Cuci Setrika, Cuci Setrika Express, Setrika Saja (per kg);
  Bed Cover, Selimut, Jas / Blazer, Sepatu, Boneka Besar (per pcs)
- **8 pelanggan** dengan nomor HP & alamat
- **30 pesanan** tersebar di 14 hari terakhir dengan berbagai status cucian, pembayaran lunas/DP/belum bayar,
  dan metode tunai/transfer/QRIS, supaya laporan & grafik langsung terisi

Isi ulang data contoh kapan saja dengan `php artisan migrate:fresh --seed` (semua data lama terhapus).

---

## Halaman

| Alamat | Isi |
|--------|-----|
| `/login` | Masuk owner |
| `/pos` | **Kasir**: pilih pelanggan & layanan, bayar, cetak/kirim struk |
| `/orders` | Pesanan: status cucian, pelunasan, struk, kabari via WA |
| `/customers` | Pelanggan: tambah, edit, hapus, hapus massal |
| `/services` | Layanan & harga: tambah, edit, aktif/nonaktif, aksi massal |
| `/reports` | Laporan pendapatan, piutang, layanan terlaris, unduh CSV |
| `/settings` | Profil toko (tampil di struk), akun owner, ganti password |

Alamat lama (`/dashboard`, `/admin`, `/staff`, `/track`) otomatis dialihkan.

### Tips kasir
- Tekan **/** untuk langsung mencari layanan.
- Kiloan bertambah 0,5 kg per klik; jumlah bisa diketik langsung (mis. `3,7`).
- Estimasi selesai terisi otomatis dari layanan dengan estimasi terlama.
- Struk dicetak untuk printer thermal **58mm**. Di dialog cetak, pilih printer thermal dan matikan header/footer browser.

---

## Ringkasan API

Base URL `http://127.0.0.1:8000/api`. Semua endpoint kecuali login butuh header `Authorization: Bearer <token>`.

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/login` | Masuk, mengembalikan token |
| GET / POST | `/me`, `/logout` | Sesi |
| PUT | `/profile`, `/profile/password` | Ubah akun & password |
| GET / PUT | `/settings` | Profil toko |
| CRUD | `/customers` | `DELETE /customers/{id}?with_orders=1` ikut hapus pesanan; `POST /customers/bulk-delete` `{ids}` atau `{all, search}` + `with_orders` |
| CRUD | `/services` | + `POST /services/bulk-status`, `POST /services/bulk-delete` |
| GET / POST | `/orders` | Daftar (filter `status`, `payment`, `search`, `from`, `to`) / transaksi baru |
| GET / DELETE | `/orders/{id}` | Detail / hapus |
| POST | `/orders/bulk-delete` | Hapus `{ids}` terpilih, atau `{all: true, filters}` semua sesuai filter |
| PATCH | `/orders/{id}/status` | Ubah status cucian |
| POST | `/orders/{id}/payments` | Terima pembayaran / pelunasan |
| GET | `/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Laporan |
