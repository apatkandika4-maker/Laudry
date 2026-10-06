# Security Guidelines
# Sistem Laundry POS + Order Management

| | |
|---|---|
| **Versi Dokumen** | 1.0 |
| **Tanggal** | 30 September 2026 |
| **Tech Stack** | Laravel (API) + Next.js (Frontend) + MySQL |
| **Terkait** | PRD.md |

Dokumen ini menjelaskan standar dan praktik keamanan yang WAJIB diterapkan pada
sistem. Tujuannya melindungi data pelanggan, data transaksi, dan mencegah akses
tidak sah.

---

## 1. Prinsip Dasar

- **Least Privilege** — setiap peran hanya punya akses seminimal yang dibutuhkan.
- **Defense in Depth** — keamanan berlapis (frontend, API, database).
- **Never Trust Input** — semua input dari user/klien dianggap tidak aman.
- **Fail Securely** — saat error, sistem tidak membocorkan informasi sensitif.
- **Secure by Default** — konfigurasi awal harus aman, bukan longgar.

---

## 2. Autentikasi (Authentication)

### 2.1 Password
- Password WAJIB di-hash memakai **bcrypt/argon2** (default Laravel `Hash::make`).
- DILARANG menyimpan password dalam bentuk plaintext.
- Terapkan aturan password minimal: panjang >= 8, kombinasi huruf & angka.
- Batasi percobaan login (rate limiting / throttle) untuk cegah brute force.

### 2.2 Token & Session
- Gunakan **Laravel Sanctum** untuk autentikasi token-based (SPA/Next.js).
- Token disimpan aman:
  - Gunakan cookie `HttpOnly` + `Secure` + `SameSite` untuk SPA jika memungkinkan,
    supaya token tidak bisa diakses JavaScript (mengurangi risiko XSS).
  - Hindari menyimpan token di `localStorage` bila bisa dihindari.
- Terapkan **expiry token** dan mekanisme logout yang benar-benar mencabut token.

---

## 3. Otorisasi (Authorization)

- Sistem ini **hanya dipakai satu akun owner**. Tidak ada pendaftaran akun dan tidak ada peran lain.
- Seluruh endpoint selain `POST /api/login` WAJIB berada di balik `auth:sanctum`.
  Pengecekan dilakukan di **sisi server (Laravel)**; guard di frontend hanya untuk kenyamanan.
- Akun owner dibuat lewat seeder. **Ganti password bawaan** (`password`) segera dari menu
  Pengaturan sebelum dipakai sungguhan.
- Bila nanti menambah pegawai, tambahkan kembali peran + middleware/Policy di server
  sebelum membuka akses.

---

## 4. Validasi & Sanitasi Input

- Validasi SEMUA input di sisi server menggunakan **Laravel Form Request / Validator**.
- Validasi tipe, panjang, format (contoh: no. HP, berat cucian harus angka > 0).
- Sanitasi input yang akan ditampilkan kembali untuk cegah XSS.
- Jangan pernah percaya validasi dari frontend saja.

---

## 5. Pencegahan Serangan Umum (OWASP Top 10)

### 5.1 SQL Injection
- WAJIB gunakan **Eloquent ORM** atau **Query Builder** dengan parameter binding.
- DILARANG merangkai query SQL langsung dari input user (string concatenation).

### 5.2 Cross-Site Scripting (XSS)
- Next.js/React sudah meng-escape output secara default — hindari `dangerouslySetInnerHTML`.
- Sanitasi konten dinamis sebelum render bila terpaksa menampilkan HTML.
- Terapkan **Content Security Policy (CSP)** header.

### 5.3 Cross-Site Request Forgery (CSRF)
- Gunakan proteksi CSRF bawaan Laravel untuk request berbasis cookie.
- Untuk Sanctum SPA, ikuti alur CSRF cookie (`/sanctum/csrf-cookie`).

### 5.4 Mass Assignment
- Gunakan `$fillable` (bukan `$guarded = []`) pada model Eloquent.
- Jangan langsung `Model::create($request->all())` tanpa filter field.

### 5.5 Sensitive Data Exposure
- Jangan kembalikan field sensitif (password hash, token) di response API.
- Gunakan **API Resource** untuk mengontrol data yang dikirim ke frontend.

---

## 6. Keamanan API

- Semua endpoint sensitif WAJIB di belakang middleware autentikasi (`auth:sanctum`).
- Terapkan **rate limiting** (Laravel `throttle`) untuk cegah abuse/brute force.
- Konfigurasi **CORS** dengan benar: hanya izinkan origin frontend yang tepercaya,
  bukan `*`.
- Tidak ada endpoint publik selain login. Halaman cek status publik sudah dihapus, sehingga
  nomor nota berurutan (`INV-YYMMDD-0001`) aman dipakai karena hanya terlihat oleh owner.
- Login dan ganti password dibatasi `throttle:10,1` (10 percobaan per menit).
- Data yang tidak boleh hilang dilindungi di level database & API:
  pelanggan yang punya pesanan tidak bisa dihapus (`restrictOnDelete`), dan item pesanan
  menyimpan salinan nama & harga layanan sehingga riwayat tetap utuh bila layanan dihapus.

---

## 7. Keamanan Data & Database

- Simpan kredensial di file **`.env`**, JANGAN di-hardcode dalam kode.
- File `.env` WAJIB masuk `.gitignore`, JANGAN di-commit ke repository.
- Gunakan user database dengan hak akses terbatas (bukan root).
- Data pribadi pelanggan (nama, no. HP, alamat) diperlakukan sebagai data sensitif.
- Lakukan **backup database berkala** dan uji proses restore-nya.

---

## 8. Transport & Konfigurasi

- Gunakan **HTTPS** di production (enkripsi data saat transit).
- Set `APP_DEBUG=false` di production agar detail error tidak bocor.
- Set `APP_ENV=production` di production.
- Terapkan security headers:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (cegah clickjacking)
  - `Content-Security-Policy`
- Sembunyikan informasi versi server/framework bila memungkinkan.

---

## 9. Logging & Monitoring

- Catat event penting: login gagal, perubahan data pesanan, akses ke laporan.
- JANGAN mencatat data sensitif (password, token) ke dalam log.
- Pantau aktivitas mencurigakan (percobaan login berlebihan).
- Simpan log dengan akses terbatas.

---

## 10. Manajemen Dependensi

- Perbarui dependensi Laravel & Next.js secara berkala (patch keamanan).
- Jalankan audit: `composer audit` dan `npm audit`.
- Pin versi dependensi; hindari memasang paket yang tidak dikenal/mencurigakan.

---

## 11. Checklist Keamanan (Pre-Deployment)

- [ ] `APP_DEBUG=false` dan `APP_ENV=production`
- [ ] `.env` tidak ter-commit ke Git
- [ ] HTTPS aktif
- [ ] Semua endpoint sensitif memakai middleware auth
- [ ] Rate limiting aktif pada login & endpoint publik
- [ ] CORS dibatasi ke origin frontend saja
- [ ] Password di-hash, tidak ada plaintext
- [ ] RBAC & Policies teruji untuk tiap peran
- [ ] Validasi input di sisi server pada semua form
- [ ] Kode nota tidak berurutan / mudah ditebak
- [ ] Security headers terpasang
- [ ] `composer audit` & `npm audit` bersih
- [ ] Backup database terjadwal & teruji

---

## 12. Pelaporan Kerentanan

Jika menemukan celah keamanan, laporkan secara privat ke pemilik proyek
(jangan dipublikasikan). Sertakan langkah reproduksi dan potensi dampaknya.
