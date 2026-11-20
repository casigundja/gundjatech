<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'client_id',
        'service_id',
        'quotation_id',
        'service_request_id',
        'manager_id',
        'name',
        'description',
        'status',
        'progress_percentage',
        'start_date',
        'deadline',
        'completed_at',
        'budget',
    ];

    protected $casts = [
        'start_date' => 'date',
        'deadline' => 'date',
        'completed_at' => 'datetime',
        'budget' => 'decimal:2',
        'progress_percentage' => 'integer',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function serviceRequest()
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function stages()
    {
        return $this->hasMany(ProjectStage::class)->orderBy('order');
    }

    public function members()
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function attachments()
    {
        return $this->hasMany(ProjectAttachment::class);
    }

    public function contracts()
    {
        return $this->hasMany(Contract::class);
    }

    public function financialTransactions()
    {
        return $this->hasMany(FinancialTransaction::class);
    }

    public function getProgressAttribute(): int
    {
        return (int) ($this->attributes['progress_percentage'] ?? 0);
    }

    public function getDueDateAttribute(): ?Carbon
    {
        return $this->deadline;
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'planning' => 'Planejamento',
            'in_progress' => 'Em Andamento',
            'on_hold' => 'Em Espera',
            'reviewing' => 'Em Revisão',
            'completed' => 'Concluído',
            'cancelled' => 'Cancelado',
            default => $this->status,
        };
    }
}
