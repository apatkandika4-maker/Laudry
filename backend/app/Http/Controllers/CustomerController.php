<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $this->searchQuery($request->query('search'))
            ->withCount('orders')
            ->withSum('orders as orders_total', 'total');

        $perPage = min(max($request->integer('per_page', 20), 1), 100);

        return response()->json($query->orderBy('name')->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $customer = Customer::create($this->validateData($request));

        return response()->json($customer, 201);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer->loadCount('orders')->loadSum('orders as orders_total', 'total');
        $customer->setRelation(
            'orders',
            $customer->orders()->latest()->limit(10)->get()
        );

        return response()->json($customer);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $customer->update($this->validateData($request));

        return response()->json($customer);
    }

    /**
     * Hapus satu pelanggan. Jika punya pesanan, wajib ?with_orders=1
     * (pesanan, item, dan pembayarannya ikut terhapus).
     */
    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        $orders = $customer->orders()->count();

        if ($orders > 0 && ! $request->boolean('with_orders')) {
            return response()->json([
                'message' => "Pelanggan ini memiliki {$orders} riwayat pesanan. Aktifkan \"hapus juga riwayat pesanan\" untuk menghapusnya.",
            ], 422);
        }

        DB::transaction(function () use ($customer) {
            $customer->orders()->delete(); // item & pembayaran ikut terhapus (cascade)
            $customer->delete();
        });

        return response()->json([
            'message' => $orders > 0
                ? "Pelanggan {$customer->name} beserta {$orders} pesanan berhasil dihapus."
                : "Pelanggan {$customer->name} berhasil dihapus.",
        ]);
    }

    /**
     * Hapus banyak pelanggan.
     * - ids: pelanggan terpilih, atau all=true untuk semua (mengikuti filter search).
     * - with_orders=true: ikut hapus riwayat pesanan; jika tidak, pelanggan berpesanan dilewati.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'all' => ['nullable', 'boolean'],
                'search' => ['nullable', 'string', 'max:255'],
                'with_orders' => ['nullable', 'boolean'],
                'ids' => ['nullable', 'array', 'max:200'],
                'ids.*' => ['integer', 'distinct'],
            ],
            ['ids.max' => 'Maksimal 200 pelanggan sekali proses.']
        );

        $all = (bool) ($data['all'] ?? false);
        if (! $all && empty($data['ids'])) {
            throw ValidationException::withMessages(['ids' => ['Pilih minimal satu pelanggan.']]);
        }

        $query = $all ? $this->searchQuery($data['search'] ?? null) : Customer::whereIn('id', $data['ids']);
        $customers = $query->withCount('orders')->get();

        $withOrders = (bool) ($data['with_orders'] ?? false);
        $targets = $withOrders ? $customers : $customers->where('orders_count', 0);
        $skipped = $withOrders ? collect() : $customers->where('orders_count', '>', 0)->pluck('name')->values();
        $ids = $targets->pluck('id');

        $ordersDeleted = 0;
        if ($ids->isNotEmpty()) {
            DB::transaction(function () use ($ids, &$ordersDeleted) {
                foreach ($ids->chunk(500) as $chunk) {
                    $ordersDeleted += Order::whereIn('customer_id', $chunk)->delete();
                    Customer::whereIn('id', $chunk)->delete();
                }
            });
        }

        $deleted = $ids->count();
        $message = match (true) {
            $deleted === 0 => 'Tidak ada pelanggan yang dihapus.',
            $ordersDeleted > 0 => "{$deleted} pelanggan dan {$ordersDeleted} pesanan berhasil dihapus.",
            default => "{$deleted} pelanggan berhasil dihapus.",
        };

        if ($skipped->isNotEmpty()) {
            $names = $skipped->take(3)->implode(', ').($skipped->count() > 3 ? ', dll' : '');
            $message .= " {$skipped->count()} dilewati karena punya riwayat pesanan ({$names}).";
        }

        return response()->json([
            'deleted' => $deleted,
            'orders_deleted' => $ordersDeleted,
            'skipped' => $skipped,
            'message' => $message,
        ]);
    }

    private function searchQuery(?string $search): Builder
    {
        $query = Customer::query();

        if ($search = trim((string) $search)) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        return $query;
    }

    private function validateData(Request $request): array
    {
        return $request->validate(
            [
                'name' => ['required', 'string', 'max:255'],
                'phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s]+$/'],
                'address' => ['nullable', 'string', 'max:500'],
                'notes' => ['nullable', 'string', 'max:500'],
            ],
            [
                'name.required' => 'Nama pelanggan wajib diisi.',
                'name.max' => 'Nama maksimal 255 karakter.',
                'phone.max' => 'Nomor HP maksimal 20 karakter.',
                'phone.regex' => 'Nomor HP hanya boleh berisi angka, spasi, + atau -.',
                'address.max' => 'Alamat maksimal 500 karakter.',
                'notes.max' => 'Catatan maksimal 500 karakter.',
            ]
        );
    }
}
