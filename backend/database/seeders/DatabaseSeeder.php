<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        mt_srand(2026); // data contoh selalu sama setiap seeding

        User::create([
            'name' => 'Owner Laundry',
            'email' => 'owner@laundry.test',
            'password' => 'password',
        ]);

        Setting::create([
            'store_name' => 'Bersih Laundry',
            'address' => 'Jl. Paris 2, Bansir Darat, Kota Pontianak, Kalimantan Barat',
            'phone' => '081234567890',
            'receipt_footer' => 'Terima kasih! Cucian yang tidak diambil lebih dari 30 hari di luar tanggung jawab kami.',
        ]);

        $services = collect([
            ['Cuci Kering Lipat', 'kg', 6000, 2],
            ['Cuci Setrika', 'kg', 8000, 2],
            ['Cuci Setrika Express', 'kg', 13000, 1],
            ['Setrika Saja', 'kg', 5000, 1],
            ['Bed Cover', 'pcs', 25000, 3],
            ['Selimut', 'pcs', 20000, 3],
            ['Jas / Blazer', 'pcs', 30000, 3],
            ['Sepatu', 'pcs', 35000, 3],
            ['Boneka Besar', 'pcs', 40000, 4],
        ])->map(fn ($s) => Service::create([
            'name' => $s[0],
            'unit' => $s[1],
            'price' => $s[2],
            'estimated_days' => $s[3],
            'is_active' => true,
        ]));

        $customers = collect([
            ['Budi Santoso', '081234567001', 'Jl. Paris 2 No. 10'],
            ['Siti Aminah', '081234567002', 'Jl. Tanjungpura No. 5'],
            ['Andi Wijaya', '081234567003', 'Perum Bansir Indah B2'],
            ['Rina Kartika', '081234567004', 'Jl. Ahmad Yani No. 22'],
            ['Doni Pratama', '081234567005', 'Jl. Gajah Mada No. 8'],
            ['Maya Lestari', '081234567006', 'Jl. Imam Bonjol No. 14'],
            ['Hendra Gunawan', '081234567007', 'Jl. Sungai Raya Dalam'],
            ['Dewi Anggraini', '081234567008', 'Komp. Duta Bandara C3'],
        ])->map(fn ($c) => Customer::create(['name' => $c[0], 'phone' => $c[1], 'address' => $c[2]]));

        $methods = ['tunai']; // toko hanya menerima tunai

        // 30 pesanan tersebar di 14 hari terakhir
        for ($n = 0; $n < 30; $n++) {
            $daysAgo = mt_rand(0, 13);
            $createdAt = Carbon::today()->subDays($daysAgo)->setTime(mt_rand(8, 20), mt_rand(0, 59));

            $picked = $services->random(mt_rand(1, 2));
            $lines = [];
            $subtotal = 0;
            $maxDays = 0;
            foreach ($picked as $service) {
                $qty = $service->unit === 'kg' ? mt_rand(20, 80) / 10 : mt_rand(1, 3);
                $line = round($service->price * $qty);
                $subtotal += $line;
                $maxDays = max($maxDays, $service->estimated_days);
                $lines[] = [
                    'service_id' => $service->id,
                    'service_name' => $service->name,
                    'unit' => $service->unit,
                    'price' => $service->price,
                    'quantity' => $qty,
                    'subtotal' => $line,
                ];
            }

            $discount = mt_rand(1, 10) === 1 ? 5000 : 0;
            $total = $subtotal - $discount;

            // Pesanan lama cenderung sudah diambil, yang baru masih proses
            $status = match (true) {
                $daysAgo >= 5 => 'diambil',
                $daysAgo >= 3 => ['siap_diambil', 'diambil'][mt_rand(0, 1)],
                $daysAgo >= 1 => ['dicuci', 'siap_diambil'][mt_rand(0, 1)],
                default => ['diterima', 'dicuci'][mt_rand(0, 1)],
            };

            $invoice = 'INV-'.$createdAt->format('ymd').'-'.str_pad((string) ($n + 1), 4, '0', STR_PAD_LEFT);

            $pickedAt = $createdAt->copy()->addDays($maxDays)->setTime(16, 0);
            if ($pickedAt->isFuture()) {
                $pickedAt = now()->subHour();
            }

            $order = new Order([
                'invoice_code' => $invoice,
                'customer_id' => $customers->random()->id,
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'status' => $status,
                'due_date' => $createdAt->copy()->addDays($maxDays)->toDateString(),
                'picked_up_at' => $status === 'diambil' ? $pickedAt : null,
            ]);
            $order->created_at = $createdAt;
            $order->updated_at = $createdAt;
            $order->save();
            $order->items()->createMany($lines);

            // Pola bayar: kebanyakan lunas di depan, sebagian DP, sebagian bayar saat ambil
            $roll = mt_rand(1, 10);
            $method = $methods[array_rand($methods)];
            if ($roll <= 6) {
                $this->pay($order, $total, $method, $createdAt);
            } elseif ($roll <= 8) {
                $dp = round($total / 2, -3);
                $this->pay($order, $dp, $method, $createdAt);
                if ($status === 'diambil') {
                    $this->pay($order, $total - $dp, 'tunai', $order->picked_up_at);
                }
            } elseif ($status === 'diambil') {
                $this->pay($order, $total, $method, $order->picked_up_at);
            }

            $order->refreshPaymentStatus();
        }
    }

    private function pay(Order $order, float $amount, string $method, Carbon $at): void
    {
        $received = $method === 'tunai' ? ceil($amount / 10000) * 10000 : null;
        $payment = $order->payments()->make([
            'amount' => $amount,
            'method' => $method,
            'received' => $received,
        ]);
        $payment->created_at = $at;
        $payment->updated_at = $at;
        $payment->save();
    }
}
