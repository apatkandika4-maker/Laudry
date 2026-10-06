<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const STATUSES = ['diterima', 'dicuci', 'siap_diambil', 'diambil'];

    protected $fillable = [
        'invoice_code',
        'customer_id',
        'subtotal',
        'discount',
        'total',
        'paid_amount',
        'payment_status',
        'status',
        'note',
        'due_date',
        'picked_up_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'due_date' => 'date:Y-m-d',
            'picked_up_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderBy('created_at');
    }

    /**
     * Nomor nota berurutan per hari: INV-YYMMDD-0001.
     */
    public static function generateInvoiceCode(): string
    {
        $prefix = 'INV-'.now()->format('ymd').'-';
        $last = self::where('invoice_code', 'like', $prefix.'%')
            ->orderByDesc('invoice_code')
            ->value('invoice_code');

        $next = $last ? ((int) substr($last, -4)) + 1 : 1;

        do {
            $code = $prefix.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
            $next++;
        } while (self::where('invoice_code', $code)->exists());

        return $code;
    }

    /**
     * Hitung ulang total dibayar & status pembayaran dari tabel payments.
     */
    public function refreshPaymentStatus(): void
    {
        $paid = (float) $this->payments()->sum('amount');
        $total = (float) $this->total;

        $this->paid_amount = $paid;
        $this->payment_status = match (true) {
            $paid >= $total && $total > 0 => 'lunas',
            $total <= 0 => 'lunas',
            $paid > 0 => 'dp',
            default => 'belum_bayar',
        };
        $this->save();
    }
}
