<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_code', 30)->unique();
            // restrictOnDelete: pelanggan yang punya pesanan tidak bisa terhapus (riwayat aman)
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->enum('payment_status', ['belum_bayar', 'dp', 'lunas'])->default('belum_bayar')->index();
            $table->enum('status', ['diterima', 'dicuci', 'siap_diambil', 'diambil'])->default('diterima')->index();
            $table->string('note', 500)->nullable();
            $table->date('due_date')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamps();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
