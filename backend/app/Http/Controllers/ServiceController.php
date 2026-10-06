<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->withCount('orderItems');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $service = Service::create($this->validateData($request));

        return response()->json($service, 201);
    }

    public function show(Service $service): JsonResponse
    {
        return response()->json($service);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $service->update($this->validateData($request));

        return response()->json($service);
    }

    /**
     * Riwayat pesanan tetap aman karena nama & harga disalin ke order_items.
     */
    public function destroy(Service $service): JsonResponse
    {
        $service->delete();

        return response()->json(['message' => 'Layanan berhasil dihapus.']);
    }

    public function bulkStatus(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'ids' => ['required', 'array', 'min:1', 'max:200'],
                'ids.*' => ['integer', 'distinct'],
                'is_active' => ['required', 'boolean'],
            ],
            [
                'ids.required' => 'Pilih minimal satu layanan.',
                'ids.min' => 'Pilih minimal satu layanan.',
                'is_active.required' => 'Status wajib ditentukan.',
            ]
        );

        $updated = Service::whereIn('id', $data['ids'])->update(['is_active' => $data['is_active']]);
        $label = $data['is_active'] ? 'diaktifkan' : 'dinonaktifkan';

        return response()->json(['updated' => $updated, 'message' => "{$updated} layanan berhasil {$label}."]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'ids' => ['required', 'array', 'min:1', 'max:200'],
                'ids.*' => ['integer', 'distinct'],
            ],
            [
                'ids.required' => 'Pilih minimal satu layanan.',
                'ids.min' => 'Pilih minimal satu layanan.',
            ]
        );

        $deleted = Service::whereIn('id', $data['ids'])->delete();

        return response()->json([
            'deleted' => $deleted,
            'skipped' => [],
            'message' => "{$deleted} layanan berhasil dihapus.",
        ]);
    }

    private function validateData(Request $request): array
    {
        return $request->validate(
            [
                'name' => ['required', 'string', 'max:255'],
                'unit' => ['required', 'in:kg,pcs'],
                'price' => ['required', 'numeric', 'min:0', 'max:100000000'],
                'estimated_days' => ['required', 'integer', 'min:0', 'max:60'],
                'is_active' => ['boolean'],
            ],
            [
                'name.required' => 'Nama layanan wajib diisi.',
                'unit.required' => 'Satuan wajib dipilih.',
                'unit.in' => 'Satuan harus kg atau pcs.',
                'price.required' => 'Harga wajib diisi.',
                'price.numeric' => 'Harga harus berupa angka.',
                'price.min' => 'Harga tidak boleh negatif.',
                'estimated_days.required' => 'Estimasi hari wajib diisi.',
                'estimated_days.integer' => 'Estimasi hari harus bilangan bulat.',
                'estimated_days.min' => 'Estimasi hari tidak boleh negatif.',
                'estimated_days.max' => 'Estimasi maksimal 60 hari.',
            ]
        );
    }
}
