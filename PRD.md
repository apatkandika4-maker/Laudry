# Product Requirements Document (PRD)
# Kasir Laundry (POS) untuk Owner

| | |
|---|---|
| **Nama Produk** | Kasir Laundry |
| **Versi Dokumen** | 2.0 (remake) |
| **Tanggal** | 03/10/2026 |
| **Jenis** | Web Application (UMKM Laundry) |
| **Tech Stack** | Laravel 13 (API) + Next.js 16 (Frontend) + MySQL |

---

## 1. Ringkasan

Aplikasi kasir (POS) laundry yang **hanya dipakai oleh pemilik (owner)**. Owner mencatat transaksi
di layar kasir, menerima pembayaran tunai (lunas atau DP), mencetak atau mengirim struk lewat
WhatsApp, memantau status cucian, dan membaca laporan pendapatan.

Perubahan dari versi 1.0:
- Peran kasir & operator dihapus. Hanya ada satu akun owner.
- Landing page pelanggan dan halaman cek status publik dihapus. Pelanggan menerima nota lewat WA.
- Pembayaran dicatat per transaksi (mendukung DP dan pelunasan bertahap).
- Tampilan baru bertema terang, dioptimalkan untuk laptop dan tablet.

---

## 2. Tujuan

- Transaksi kasir selesai dalam kurang dari 1 menit.
- Harga dihitung otomatis dari layanan × berat/jumlah, dikurangi diskon.
- Status setiap cucian jelas: Diterima → Dicuci → Siap Diambil → Diambil.
- Piutang (pesanan belum lunas) mudah dilacak dan ditagih.
- Owner bisa melihat pendapatan harian/bulanan kapan saja.

### Di luar cakupan
- Payment gateway (pembayaran hanya dicatat, tidak diproses online).
- Multi-cabang, multi-pengguna, dan aplikasi mobile native.
- Portal pelanggan / pelacakan publik.

---

## 3. Pengguna

| Peran | Akses |
|-------|-------|
| **Owner** | Seluruh fitur. Satu-satunya akun yang bisa masuk. |

---

## 4. Fitur

### 4.1 Kasir (POS) — halaman utama setelah masuk
- Daftar layanan aktif sebagai kartu, bisa dicari dan difilter Kiloan/Satuan.
- Pilih pelanggan dengan pencarian cepat atau tambah pelanggan baru tanpa pindah halaman.
- Keranjang: atur jumlah (kg langkah 0,5; pcs bilangan bulat), hapus item.
- Estimasi selesai otomatis dari layanan dengan estimasi terlama (bisa diubah).
- Diskon (Rp) dan catatan pesanan.
- Pembayaran tunai: **Lunas / DP / Bayar Nanti**. Input uang diterima, tombol nominal cepat,
  dan kembalian otomatis. Tidak ada payment gateway.
- DP dan pelunasan dicatat pada nota yang sama; struk menampilkan baris DP, Pelunasan, sisa, dan status LUNAS.
- Setelah tersimpan: struk tampil, bisa dicetak (thermal 58mm) atau dikirim via WhatsApp.
- Ringkasan hari ini: pendapatan, jumlah transaksi, cucian siap diambil.

### 4.2 Pesanan
- Tab status beserta jumlahnya, pencarian nota/nama/HP, filter periode & pembayaran.
- Tombol cepat untuk memajukan status.
- Detail pesanan: ubah status, riwayat pembayaran, terima pelunasan, cetak struk,
  kirim WA (struk atau kabar "siap diambil"), hapus pesanan.
- Peringatan bila pesanan ditandai diambil tetapi masih ada sisa tagihan.
- Penanda pesanan yang lewat estimasi selesai.

### 4.3 Pelanggan
- Tambah, edit, hapus, cari (nama/HP/alamat), dan hapus massal.
- Menampilkan jumlah pesanan dan total belanja per pelanggan.
- Pelanggan yang punya riwayat pesanan tidak bisa dihapus.

### 4.4 Layanan
- Tambah, edit, hapus; atur satuan (kg/pcs), harga, estimasi hari, dan status aktif.
- Aksi massal: aktifkan, nonaktifkan, hapus.
- Riwayat pesanan tetap utuh karena nama & harga layanan disalin ke setiap pesanan.

### 4.5 Laporan
- Periode: hari ini, 7 hari, 30 hari, bulan ini, bulan lalu, atau rentang tanggal sendiri.
- Pendapatan (berdasarkan uang masuk), jumlah & nilai pesanan, rata-rata per pesanan.
- Piutang keseluruhan, grafik pendapatan harian, rincian metode bayar,
  antrean cucian, dan 5 layanan terlaris.
  (Rincian metode bayar dihapus karena toko hanya menerima tunai.)
- Unduh CSV.

### 4.6 Pengaturan
- Profil toko (nama, alamat, HP/WA, catatan bawah struk) dengan pratinjau struk.
- Ubah nama & email owner, ganti password.

---

## 5. Kebutuhan Non-Fungsional

- **Bahasa:** seluruh antarmuka dan pesan kesalahan berbahasa Indonesia.
- **Format:** tanggal dd/mm/yyyy, mata uang Rupiah, zona waktu WIB (Asia/Jakarta).
- **Keamanan:** lihat `SECURITY.md`.
- **Responsif:** nyaman di laptop dan tablet; tetap bisa dipakai di HP.

---

## 6. Model Data

- **users** — name, email, password (hanya owner)
- **settings** — store_name, address, phone, receipt_footer (satu baris)
- **customers** — name, phone, address, notes
- **services** — name, unit (kg/pcs), price, estimated_days, is_active
- **orders** — invoice_code, customer_id, subtotal, discount, total, paid_amount,
  payment_status (belum_bayar/dp/lunas), status (diterima/dicuci/siap_diambil/diambil),
  note, due_date, picked_up_at
- **order_items** — order_id, service_id (boleh kosong), service_name, unit, price, quantity, subtotal
- **payments** — order_id, amount, method (tunai/transfer/qris), received, note

Nomor nota berurutan per hari: `INV-YYMMDD-0001`.
