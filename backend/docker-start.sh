#!/usr/bin/env bash
# Skrip start untuk Render. Menyiapkan DB lalu menjalankan server.
set -e

# Pastikan file database SQLite ada (dipakai pada plan gratis Render).
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
  DB_FILE="${DB_DATABASE:-/app/database/database.sqlite}"
  mkdir -p "$(dirname "$DB_FILE")"
  touch "$DB_FILE"
  chmod -R ug+rw "$(dirname "$DB_FILE")" || true
fi

# Bersihkan cache lama, lalu cache config/route untuk performa produksi.
php artisan config:clear || true
php artisan config:cache || true
php artisan route:cache || true

# Jalankan migrasi. Database di-seed sekali saja (saat tabel settings belum ada).
php artisan migrate --force || true

# Seed data contoh hanya jika belum ada pengaturan toko (deploy pertama).
NEEDS_SEED=$(php artisan tinker --execute="try { echo \Illuminate\Support\Facades\Schema::hasTable('settings') && \App\Models\Setting::count() ? 'no' : 'yes'; } catch (\Throwable \$e) { echo 'yes'; }" 2>/dev/null | tail -n1)
if [ "$NEEDS_SEED" = "yes" ]; then
  echo "Seeding data contoh (deploy pertama)..."
  php artisan db:seed --force || true
fi

# Jalankan server di port yang diberikan Render.
php artisan serve --host=0.0.0.0 --port="${PORT:-10000}"
