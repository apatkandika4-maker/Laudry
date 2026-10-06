<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            // nullOnDelete: nama & harga disimpan sebagai snapshot di baris ini
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->string('service_name');
            $table->enum('unit', ['kg', 'pcs']);
            $table->decimal('price', 12, 2);
            $table->decimal('quantity', 8, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
