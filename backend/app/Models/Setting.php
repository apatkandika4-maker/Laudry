<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Profil toko (satu baris).
 */
class Setting extends Model
{
    protected $fillable = [
        'store_name',
        'address',
        'phone',
        'receipt_footer',
    ];

    public static function current(): self
    {
        return self::query()->firstOrCreate(
            ['id' => 1],
            ['store_name' => 'Laundry Saya', 'receipt_footer' => 'Terima kasih telah mempercayakan cucian Anda kepada kami.']
        );
    }
}
