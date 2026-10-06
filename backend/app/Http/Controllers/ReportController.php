<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    /**
     * Ringkasan periode: ?from=YYYY-MM-DD&to=YYYY-MM-DD (default: hari ini).
     * Pendapatan dihitung dari pembayaran yang masuk pada periode tersebut.
     */
    public function summary(Request $request): JsonResponse
    {
        $request->validate(
            [
                'from' => ['nullable', 'date_format:Y-m-d'],
                'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            ],
            [
                'from.date_format' => 'Format tanggal awal tidak valid.',
                'to.date_format' => 'Format tanggal akhir tidak valid.',
                'to.after_or_equal' => 'Tanggal akhir tidak boleh sebelum tanggal awal.',
            ]
        );

        $from = Carbon::parse($request->query('from', today()->toDateString()))->startOfDay();
        $to = Carbon::parse($request->query('to', $from->toDateString()))->endOfDay();

        if ($from->diffInDays($to) > 366) {
            return response()->json(['message' => 'Rentang laporan maksimal 1 tahun.'], 422);
        }

        $payments = Payment::whereBetween('created_at', [$from, $to]);
        $orders = Order::whereBetween('created_at', [$from, $to]);

        $revenue = (float) (clone $payments)->sum('amount');
        $ordersCount = (clone $orders)->count();
        $ordersValue = (float) (clone $orders)->sum('total');

        $byMethod = (clone $payments)
            ->selectRaw('method, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('method')
            ->get()
            ->keyBy('method');

        $methods = collect(Payment::METHODS)->map(fn ($m) => [
            'method' => $m,
            'total' => (float) ($byMethod[$m]->total ?? 0),
            'count' => (int) ($byMethod[$m]->count ?? 0),
        ])->values();

        // Seri harian
        $dailyRevenue = (clone $payments)
            ->selectRaw('DATE(created_at) as day, SUM(amount) as total')
            ->groupBy('day')->pluck('total', 'day');
        $dailyOrders = (clone $orders)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')->pluck('total', 'day');

        $daily = [];
        for ($d = $from->copy(); $d->lte($to); $d->addDay()) {
            $key = $d->toDateString();
            $daily[] = [
                'date' => $key,
                'revenue' => (float) ($dailyRevenue[$key] ?? 0),
                'orders' => (int) ($dailyOrders[$key] ?? 0),
            ];
        }

        $topServices = OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereBetween('orders.created_at', [$from, $to])
            ->selectRaw('order_items.service_name as name, order_items.unit, SUM(order_items.quantity) as quantity, SUM(order_items.subtotal) as total, COUNT(*) as count')
            ->groupBy('order_items.service_name', 'order_items.unit')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'name' => $r->name,
                'unit' => $r->unit,
                'quantity' => (float) $r->quantity,
                'total' => (float) $r->total,
                'count' => (int) $r->count,
            ]);

        // Piutang & antrean berlaku keseluruhan (bukan per periode)
        $unpaid = Order::where('payment_status', '!=', 'lunas');
        $receivable = (float) (clone $unpaid)->selectRaw('SUM(total - paid_amount) as s')->value('s');

        $queue = Order::where('status', '!=', 'diambil')
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'revenue' => $revenue,
            'orders_count' => $ordersCount,
            'orders_value' => $ordersValue,
            'average_order' => $ordersCount ? round($ordersValue / $ordersCount, 2) : 0,
            'payment_methods' => $methods,
            'daily' => $daily,
            'top_services' => $topServices,
            'receivable' => [
                'amount' => $receivable,
                'count' => (clone $unpaid)->count(),
            ],
            'queue' => [
                'diterima' => (int) ($queue['diterima'] ?? 0),
                'dicuci' => (int) ($queue['dicuci'] ?? 0),
                'siap_diambil' => (int) ($queue['siap_diambil'] ?? 0),
            ],
        ]);
    }
}
