<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Satu baris saja: profil toko untuk struk & tampilan.
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('store_name');
            $table->string('address', 500)->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('receipt_footer', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
