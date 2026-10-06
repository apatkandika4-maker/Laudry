<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(Setting::current());
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'store_name' => ['required', 'string', 'max:255'],
                'address' => ['nullable', 'string', 'max:500'],
                'phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s]+$/'],
                'receipt_footer' => ['nullable', 'string', 'max:500'],
            ],
            [
                'store_name.required' => 'Nama toko wajib diisi.',
                'phone.regex' => 'Nomor HP hanya boleh berisi angka, spasi, + atau -.',
                'address.max' => 'Alamat maksimal 500 karakter.',
                'receipt_footer.max' => 'Catatan struk maksimal 500 karakter.',
            ]
        );

        $setting = Setting::current();
        $setting->update($data);

        return response()->json([
            'setting' => $setting,
            'message' => 'Pengaturan toko berhasil disimpan.',
        ]);
    }
}
