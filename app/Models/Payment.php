<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'financial_transaction_id',
        'client_id',
        'amount',
        'payment_method',
        'status',
        'transaction_id',
        'proof_path',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function transaction()
    {
        return $this->belongsTo(FinancialTransaction::class, 'financial_transaction_id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
