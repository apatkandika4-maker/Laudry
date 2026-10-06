<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SettingController;
use Illuminate\Support\Facades\Route;

/*
| Sistem ini hanya dipakai owner. Satu-satunya endpoint publik adalah login.
*/
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    // Akun
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/profile/password', [AuthController::class, 'updatePassword'])->middleware('throttle:10,1');

    // Profil toko
    Route::get('/settings', [SettingController::class, 'show']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Pelanggan
    Route::post('/customers/bulk-delete', [CustomerController::class, 'bulkDestroy']);
    Route::apiResource('customers', CustomerController::class);

    // Layanan
    Route::post('/services/bulk-status', [ServiceController::class, 'bulkStatus']);
    Route::post('/services/bulk-delete', [ServiceController::class, 'bulkDestroy']);
    Route::apiResource('services', ServiceController::class);

    // Pesanan (kasir)
    Route::post('/orders/bulk-delete', [OrderController::class, 'bulkDestroy']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::get('/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('/orders/{order}/payments', [OrderController::class, 'addPayment']);
    Route::delete('/orders/{order}', [OrderController::class, 'destroy']);

    // Laporan
    Route::get('/reports/summary', [ReportController::class, 'summary']);
});
