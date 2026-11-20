<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DomainRenewal extends Model
{
    use HasFactory;

    protected $fillable = [
        'domain_id',
        'renewal_date',
        'next_expiration_date',
        'amount',
        'invoice_number',
    ];

    protected $casts = [
        'renewal_date' => 'date',
        'next_expiration_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function domain()
    {
        return $this->belongsTo(Domain::class);
    }
}
