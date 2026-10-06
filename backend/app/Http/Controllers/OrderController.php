<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Service;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $this->filteredQuery($request->only(['status', 'payment', 'from', 'to', 'search']))
            ->with('customer:id,name,phone');

        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        $orders = $query->latest()->paginate($perPage);

        // Hitung ringkas untuk tab status (tanpa filter status).
        $raw = Order::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $counts = collect(Order::STATUSES)->mapWithKeys(fn ($s) => [$s => (int) ($raw[$s] ?? 0)]);

        return response()->json(array_merge($orders->toArray(), [
            'status_counts' => $counts,
        ]));
    }

    /**
     * Transaksi kasir: buat pesanan + (opsional) pembayaran awal.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'customer_id' => ['required', 'integer', 'exists:customers,id'],
                'items' => ['required', 'array', 'min:1', 'max:50'],
                'items.*.service_id' => [
                    'required', 'integer', 'distinct',
                    Rule::exists('services', 'id')->where('is_active', true),
                ],
                'items.*.quantity' => ['required', 'numeric', 'min:0.1', 'max:999'],
                'discount' => ['nullable', 'numeric', 'min:0'],
                'note' => ['nullable', 'string', 'max:500'],
                'due_date' => ['nullable', 'date', 'after_or_equal:today'],
                'payment' => ['nullable', 'array'],
                'payment.amount' => ['required_with:payment', 'numeric', 'min:0'],
                'payment.method' => ['nullable', Rule::in(Payment::METHODS)],
                'payment.received' => ['nullable', 'numeric', 'min:0'],
            ],
            [
                'customer_id.required' => 'Pilih pelanggan terlebih dahulu.',
                'customer_id.exists' => 'Pelanggan tidak ditemukan.',
                'items.required' => 'Tambahkan minimal satu layanan.',
                'items.min' => 'Tambahkan minimal satu layanan.',
                'items.*.service_id.exists' => 'Layanan tidak tersedia atau sudah nonaktif.',
                'items.*.service_id.distinct' => 'Layanan yang sama tidak boleh dobel.',
                'items.*.quantity.min' => 'Jumlah minimal 0,1.',
                'items.*.quantity.max' => 'Jumlah maksimal 999.',
                'discount.min' => 'Diskon tidak boleh negatif.',
                'due_date.after_or_equal' => 'Estimasi selesai tidak boleh sebelum hari ini.',
                'payment.method.in' => 'Metode bayar tidak valid.',
            ]
        );

        $order = DB::transaction(function () use ($data) {
            $services = Service::whereIn('id', collect($data['items'])->pluck('service_id'))->get()->keyBy('id');

            $lines = [];
            $subtotal = 0.0;
            $maxDays = 0;
            foreach ($data['items'] as $i => $item) {
                $service = $services[$item['service_id']];
                $qty = round((float) $item['quantity'], 2);

                if ($service->unit === 'pcs' && floor($qty) != $qty) {
                    throw ValidationException::withMessages([
                        "items.{$i}.quantity" => ["Jumlah {$service->name} harus bilangan bulat (pcs)."],
                    ]);
                }

                $lineTotal = round((float) $service->price * $qty, 2);
                $subtotal += $lineTotal;
                $maxDays = max($maxDays, (int) $service->estimated_days);
                $lines[] = [
                    'service_id' => $service->id,
                    'service_name' => $service->name,
                    'unit' => $service->unit,
                    'price' => $service->price,
                    'quantity' => $qty,
                    'subtotal' => $lineTotal,
                ];
            }

            $discount = round((float) ($data['discount'] ?? 0), 2);
            if ($discount > $subtotal) {
                throw ValidationException::withMessages(['discount' => ['Diskon tidak boleh melebihi subtotal.']]);
            }
            $total = round($subtotal - $discount, 2);

            $order = Order::create([
                'invoice_code' => Order::generateInvoiceCode(),
                'customer_id' => $data['customer_id'],
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'status' => 'diterima',
                'note' => $data['note'] ?? null,
                'due_date' => $data['due_date'] ?? Carbon::today()->addDays($maxDays)->toDateString(),
            ]);
            $order->items()->createMany($lines);

            if (! empty($data['payment']) && (float) $data['payment']['amount'] > 0) {
                $this->recordPayment($order, $data['payment']);
            } else {
                $order->refreshPaymentStatus();
            }

            return $order;
        });

        return response()->json($this->detail($order), 201);
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json($this->detail($order));
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(
            ['status' => ['required', Rule::in(Order::STATUSES)]],
            ['status.in' => 'Status tidak valid.']
        );

        $order->status = $data['status'];
        $order->picked_up_at = $data['status'] === 'diambil' ? ($order->picked_up_at ?? now()) : null;
        $order->save();

        return response()->json($this->detail($order));
    }

    public function addPayment(Request $request, Order $order): JsonResponse
    {
        $data = $request->validate(
            [
                'amount' => ['required', 'numeric', 'min:1'],
                'method' => ['nullable', Rule::in(Payment::METHODS)],
                'received' => ['nullable', 'numeric', 'min:0'],
                'note' => ['nullable', 'string', 'max:255'],
            ],
            [
                'amount.required' => 'Nominal bayar wajib diisi.',
                'amount.min' => 'Nominal bayar minimal Rp 1.',
                'method.in' => 'Metode bayar tidak valid.',
            ]
        );

        $remaining = round((float) $order->total - (float) $order->paid_amount, 2);
        if ($remaining <= 0) {
            throw ValidationException::withMessages(['amount' => ['Pesanan ini sudah lunas.']]);
        }

        DB::transaction(fn () => $this->recordPayment($order, $data));

        return response()->json($this->detail($order->fresh()));
    }

    public function destroy(Order $order): JsonResponse
    {
        $order->delete();

        return response()->json(['message' => "Pesanan {$order->invoice_code} berhasil dihapus."]);
    }

    /**
     * Hapus banyak pesanan: ids terpilih, atau all=true untuk semua yang cocok dengan filter.
     * Item & pembayaran ikut terhapus (cascade).
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'all' => ['nullable', 'boolean'],
                'ids' => ['nullable', 'array', 'max:200'],
                'ids.*' => ['integer', 'distinct'],
                'filters' => ['nullable', 'array'],
                'filters.status' => ['nullable', Rule::in(Order::STATUSES)],
                'filters.payment' => ['nullable', 'string', 'max:20'],
                'filters.from' => ['nullable', 'date_format:Y-m-d'],
                'filters.to' => ['nullable', 'date_format:Y-m-d'],
                'filters.search' => ['nullable', 'string', 'max:255'],
            ],
            ['ids.max' => 'Maksimal 200 pesanan sekali proses.']
        );

        $all = (bool) ($data['all'] ?? false);
        if (! $all && empty($data['ids'])) {
            throw ValidationException::withMessages(['ids' => ['Pilih minimal satu pesanan.']]);
        }

        $query = $all ? $this->filteredQuery($data['filters'] ?? []) : Order::whereIn('id', $data['ids']);
        $deleted = DB::transaction(fn () => $query->delete());

        return response()->json([
            'deleted' => $deleted,
            'skipped' => [],
            'message' => $deleted > 0 ? "{$deleted} pesanan berhasil dihapus." : 'Tidak ada pesanan yang dihapus.',
        ]);
    }

    /**
     * Query pesanan dengan filter: status, payment (belum_lunas|lunas|dp|belum_bayar), from, to, search.
     */
    private function filteredQuery(array $f): Builder
    {
        $query = Order::query();

        if (! empty($f['status'])) {
            $query->where('status', $f['status']);
        }

        $payment = $f['payment'] ?? null;
        if ($payment === 'belum_lunas') {
            $query->where('payment_status', '!=', 'lunas');
        } elseif ($payment) {
            $query->where('payment_status', $payment);
        }

        if (! empty($f['from'])) {
            $query->whereDate('created_at', '>=', $f['from']);
        }
        if (! empty($f['to'])) {
            $query->whereDate('created_at', '<=', $f['to']);
        }

        $search = trim((string) ($f['search'] ?? ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_code', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($c) => $c
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%"));
            });
        }

        return $query;
    }

    /**
     * Simpan pembayaran. Nominal dibatasi sisa tagihan; uang diterima (tunai) wajib >= nominal.
     */
    private function recordPayment(Order $order, array $payment): void
    {
        // Toko hanya menerima tunai; metode lain tetap valid untuk data lama.
        $payment['method'] = $payment['method'] ?? 'tunai';

        $remaining = round((float) $order->total - (float) $order->paid_amount, 2);
        $amount = min(round((float) $payment['amount'], 2), $remaining);

        $received = isset($payment['received']) && $payment['received'] !== null
            ? round((float) $payment['received'], 2)
            : null;

        if ($payment['method'] !== 'tunai') {
            $received = null;
        } elseif ($received !== null && $received < $amount) {
            throw ValidationException::withMessages(['payment.received' => ['Uang diterima kurang dari nominal bayar.']]);
        }

        if ($amount > 0) {
            $order->payments()->create([
                'amount' => $amount,
                'method' => $payment['method'],
                'received' => $received,
                'note' => $payment['note'] ?? null,
            ]);
        }

        $order->refreshPaymentStatus();
    }

    private function detail(Order $order): Order
    {
        return $order->load(['customer', 'items', 'payments']);
    }
}
