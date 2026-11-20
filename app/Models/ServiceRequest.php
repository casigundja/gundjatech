<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'protocol',
        'client_id',
        'user_id',
        'service_id',
        'name',
        'contact_name',
        'company',
        'company_name',
        'email',
        'phone',
        'service_title',
        'title',
        'description',
        'estimated_budget',
        'desired_deadline',
        'status',
        'internal_notes',
        'assigned_user_id',
        'assigned_to',
    ];

    protected $casts = [
        'estimated_budget' => 'decimal:2',
        'desired_deadline' => 'date',
    ];

    // Aliases & Accessors for flexible field access
    public function getTitleAttribute(): ?string
    {
        return $this->attributes['service_title'] ?? $this->attributes['title'] ?? null;
    }

    public function setTitleAttribute(?string $value): void
    {
        $this->attributes['service_title'] = $value;
    }

    public function getContactNameAttribute(): ?string
    {
        return $this->attributes['name'] ?? null;
    }

    public function setContactNameAttribute(?string $value): void
    {
        $this->attributes['name'] = $value;
    }

    public function getCompanyNameAttribute(): ?string
    {
        return $this->attributes['company'] ?? null;
    }

    public function setCompanyNameAttribute(?string $value): void
    {
        $this->attributes['company'] = $value;
    }

    public function getAssignedToAttribute(): ?int
    {
        return $this->attributes['assigned_user_id'] ?? null;
    }

    public function setAssignedToAttribute(?int $value): void
    {
        $this->attributes['assigned_user_id'] = $value;
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function statusHistories()
    {
        return $this->hasMany(RequestStatusHistory::class)->latest();
    }

    public function attachments()
    {
        return $this->hasMany(RequestAttachment::class);
    }

    public function quotations()
    {
        return $this->hasMany(Quotation::class);
    }

    public function quotation()
    {
        return $this->hasOne(Quotation::class)->latestOfMany();
    }

    public function project()
    {
        return $this->hasOne(Project::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'new' => 'Nova Solicitação',
            'analyzing' => 'Em Análise',
            'awaiting_info' => 'Aguardando Informações',
            'quotation_sent', 'quoted' => 'Orçamento Enviado',
            'awaiting_approval' => 'Aguardando Aprovação',
            'approved' => 'Aprovada',
            'in_progress' => 'Em Execução',
            'completed' => 'Concluída',
            'cancelled' => 'Cancelada',
            default => ucfirst(str_replace('_', ' ', $this->status)),
        };
    }
}
