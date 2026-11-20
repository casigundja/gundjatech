<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Domain extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'domain_name',
        'registrar',
        'registration_date',
        'expiration_date',
        'renewal_price',
        'status',
        'auto_renew',
        'nameservers',
        'notes',
    ];

    protected $casts = [
        'registration_date' => 'date',
        'expiration_date' => 'date',
        'renewal_price' => 'decimal:2',
        'auto_renew' => 'boolean',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function renewals()
    {
        return $this->hasMany(DomainRenewal::class);
    }

    public function dnsRecords()
    {
        return $this->hasMany(DnsRecord::class);
    }

    public function getDaysUntilExpirationAttribute(): int
    {
        return (int) now()->startOfDay()->diffInDays($this->expiration_date->startOfDay(), false);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Ativo',
            'expiring_soon' => 'Expirando em breve',
            'expired' => 'Expirado',
            'pending' => 'Pendente',
            'cancelled' => 'Cancelado',
            default => ucfirst(str_replace('_', ' ', (string) $this->status)),
        };
    }

    public function getExpiresAtAttribute()
    {
        return $this->expiration_date;
    }

    public function setExpiresAtAttribute($value): void
    {
        $this->attributes['expiration_date'] = $value;
    }

    public function getRegisteredAtAttribute()
    {
        return $this->registration_date;
    }

    public function setRegisteredAtAttribute($value): void
    {
        $this->attributes['registration_date'] = $value;
    }
}
