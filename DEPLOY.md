# Panduan Online-kan Aplikasi (bisa dibuka dari HP)

Aplikasi punya 2 bagian yang di-hosting di tempat berbeda:

- **Backend (Laravel + database)** -> Render (gratis)
- **Frontend (Next.js)** -> Vercel (gratis)

Hasil akhir: alamat seperti `https://laundry-kamu.vercel.app` yang bisa dibuka
dari HP mana saja.

> Catatan paket gratis: backend Render "tidur" bila 15 menit tak dipakai, jadi
> buka pertama bisa lambat ~30 detik. Cocok untuk demo/portofolio, bukan data penting.
>
> Database memakai SQLite (file) supaya TIDAK perlu kartu kredit. Datanya bisa
> ter-reset setiap deploy ulang — aman untuk demo. Kalau form "Add Card" muncul,
> klik Cancel; blueprint ini tidak lagi butuh database berbayar.

---

## Bagian 1 — Backend ke Render

1. Buka https://render.com, daftar/masuk pakai akun GitHub.
2. Klik **New +** -> **Blueprint**.
3. Pilih repository **Laudry**. Render otomatis membaca file `render.yaml`
   dan menyiapkan service `laudry-api` (pakai SQLite, tanpa database terpisah).
4. Klik **Apply**. (Kalau diminta "Add Card", klik **Cancel** — tidak diperlukan.)
5. Buka service **laudry-api** -> tab **Environment**, isi 3 variabel ini
   (lainnya sudah otomatis):

   | Key | Nilai |
   |-----|-------|
   | `APP_KEY` | lihat cara dapat di bawah |
   | `APP_URL` | URL service ini, mis. `https://laudry-api.onrender.com` |
   | `FRONTEND_URL` | isi sementara `https://localhost`, nanti diganti di Bagian 3 |

   **Cara dapat APP_KEY:** di komputer, jalankan di folder `backend`:
   ```bash
   php artisan key:generate --show
   ```
   Salin hasilnya (format `base64:....`) ke `APP_KEY`.

6. Klik **Save, rebuild, and deploy**. Tunggu status **Live** (hijau).
7. Buka `https://laudry-api.onrender.com/up` di browser. Kalau muncul halaman OK,
   backend sudah jalan. Database juga sudah terisi data contoh otomatis.

Catat alamat backend ini, dipakai di Bagian 2.

---

## Bagian 2 — Frontend ke Vercel

1. Buka https://vercel.com, daftar/masuk pakai akun GitHub.
2. Klik **Add New...** -> **Project**, pilih repository **Laudry**.
3. Di **Root Directory**, klik **Edit** lalu pilih folder **`frontend`**. (penting)
4. Buka **Environment Variables**, tambahkan:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://laudry-api.onrender.com/api` (pakai alamat backend dari Bagian 1, akhiri `/api`) |

5. Klik **Deploy**. Tunggu selesai, lalu salin alamat yang diberikan,
   mis. `https://laundry-kamu.vercel.app`.

---

## Bagian 3 — Sambungkan keduanya

1. Kembali ke Render -> service **laudry-api** -> **Environment**.
2. Ubah `FRONTEND_URL` menjadi alamat Vercel tadi, mis.
   `https://laundry-kamu.vercel.app` (tanpa garis miring di akhir).
3. **Save, rebuild, and deploy** sekali lagi.

Selesai. Buka alamat Vercel di HP, login:

```
Email    : owner@laundry.test
Password : password
```

---

## Kalau mau update aplikasi nanti

Cukup push perubahan ke GitHub (branch `main`). Render dan Vercel otomatis
deploy ulang versi terbaru.

```bash
git add -A
git commit -m "update fitur"
git push
```

---

## Masalah umum

- **Login gagal / "Tidak dapat terhubung ke server"**: `NEXT_PUBLIC_API_URL` di
  Vercel salah. Pastikan pakai alamat backend Render dan diakhiri `/api`.
- **CORS error di console browser**: `FRONTEND_URL` di Render belum diisi alamat
  Vercel yang benar (Bagian 3).
- **Buka pertama lambat**: wajar untuk paket gratis Render (service bangun dari tidur).
- **Data contoh hilang setelah lama**: database gratis Render ada batas usia.
  Untuk pemakaian sungguhan, pakai database berbayar.
