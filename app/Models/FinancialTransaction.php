<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'project_id',
        'type',
        'category',
        'title',
        'description',
        'amount',
        'due_date',
        'paid_date',
        'status',
        'payment_method',
        'invoice_url',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_date' => 'date',
    ];

    public function getTransactionDateAttribute()
    {
        return $this->paid_date ?? $this->due_date ?? $this->created_at;
    }

    public function setTransactionDateAttribute($value): void
    {
        $this->attributes['paid_date'] = $value;
        $this->attributes['due_date'] = $value;
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'paid' => 'Pago',
            'pending' => 'Pendente',
            'overdue' => 'Vencido',
            'cancelled' => 'Cancelado',
            default => ucfirst((string) $this->status),
        };
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
