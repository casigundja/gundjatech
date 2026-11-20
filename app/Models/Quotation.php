<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'quotation_number',
        'service_request_id',
        'client_id',
        'user_id',
        'title',
        'subtotal',
        'discount',
        'total',
        'total_amount',
        'status',
        'valid_until',
        'notes',
        'approved_at',
    ];

    public function getTotalAmountAttribute(): float
    {
        return (float) ($this->attributes['total'] ?? 0);
    }

    public function setTotalAmountAttribute($value): void
    {
        $this->attributes['total'] = $value;
    }

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'valid_until' => 'date',
        'approved_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function serviceRequest()
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    public function items()
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function contract()
    {
        return $this->hasOne(Contract::class);
    }

    public function project()
    {
        return $this->hasOne(Project::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Rascunho',
            'sent' => 'Enviado',
            'approved' => 'Aprovado',
            'rejected' => 'Recusado',
            'expired' => 'Expirado',
            default => ucfirst($this->status),
        };
    }
}
