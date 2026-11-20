<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'contact_name',
        'company_name',
        'trade_name',
        'email',
        'phone',
        'document',
        'address',
        'city',
        'state',
        'postal_code',
        'notes',
        'status',
    ];

    public function getDisplayNameAttribute(): string
    {
        return $this->attributes['company_name'] ?? $this->attributes['name'] ?? 'Cliente sem nome';
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Ativo',
            'inactive' => 'Inativo',
            'lead' => 'Lead',
            default => ucfirst((string) $this->status),
        };
    }

    public function getContactNameAttribute(): ?string
    {
        return $this->attributes['name'] ?? null;
    }

    public function setContactNameAttribute(?string $value): void
    {
        $this->attributes['name'] = $value;
    }

    public function getTradeNameAttribute(): ?string
    {
        return $this->attributes['company_name'] ?? null;
    }

    public function setTradeNameAttribute(?string $value): void
    {
        if (empty($this->attributes['company_name'])) {
            $this->attributes['company_name'] = $value;
        }
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function serviceRequests()
    {
        return $this->hasMany(ServiceRequest::class);
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }

    public function quotations()
    {
        return $this->hasMany(Quotation::class);
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function domains()
    {
        return $this->hasMany(Domain::class);
    }

    public function campaigns()
    {
        return $this->hasMany(AdvertisingCampaign::class);
    }

    public function advertisingCampaigns()
    {
        return $this->hasMany(AdvertisingCampaign::class);
    }

    public function financialTransactions()
    {
        return $this->hasMany(FinancialTransaction::class);
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class);
    }
}
