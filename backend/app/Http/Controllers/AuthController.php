<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(
            [
                'email' => ['required', 'email'],
                'password' => ['required', 'string'],
            ],
            [
                'email.required' => 'Email wajib diisi.',
                'email.email' => 'Format email tidak valid.',
                'password.required' => 'Password wajib diisi.',
            ]
        );

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        $token = $user->createToken('owner')->plainTextToken;

        return response()->json([
            'user' => $this->payload($user),
            'token' => $token,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->payload($request->user())]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(
            [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            ],
            [
                'name.required' => 'Nama wajib diisi.',
                'email.required' => 'Email wajib diisi.',
                'email.email' => 'Format email tidak valid.',
                'email.unique' => 'Email sudah dipakai.',
            ]
        );

        $user->update($data);

        return response()->json([
            'user' => $this->payload($user),
            'message' => 'Profil berhasil diperbarui.',
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate(
            [
                'current_password' => ['required', 'string'],
                'password' => ['required', 'string', 'min:8', 'confirmed'],
            ],
            [
                'current_password.required' => 'Password lama wajib diisi.',
                'password.required' => 'Password baru wajib diisi.',
                'password.min' => 'Password baru minimal 8 karakter.',
                'password.confirmed' => 'Konfirmasi password baru tidak sama.',
            ]
        );

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password lama salah.'],
            ]);
        }

        $user->update(['password' => $data['password']]);

        return response()->json(['message' => 'Password berhasil diganti.']);
    }

    private function payload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ];
    }
}
