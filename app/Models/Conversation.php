<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'service_request_id',
        'user_id',
        'subject',
        'channel',
        'visitor_token',
        'visitor_name',
        'visitor_email',
        'visitor_phone',
        'status',
        'ai_enabled',
        'crm_stage',
        'lead_score',
        'ai_summary',
        'extracted_data',
        'ai_handoff_reason',
        'closed_at',
    ];

    protected $casts = [
        'ai_enabled' => 'boolean',
        'lead_score' => 'integer',
        'extracted_data' => 'array',
        'closed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function serviceRequest()
    {
        return $this->belongsTo(ServiceRequest::class);
    }

    public function attendant()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function assignedStaff()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function latestMessage()
    {
        return $this->hasOne(ConversationMessage::class)->latestOfMany();
    }

    public function messages()
    {
        return $this->hasMany(ConversationMessage::class)->oldest();
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'open' => 'Aberto',
            'waiting_client' => 'Aguardando Cliente',
            'waiting_staff' => 'Aguardando Equipe',
            'closed' => 'Encerrado',
            default => ucfirst(str_replace('_', ' ', (string) $this->status)),
        };
    }

    public function getCrmStageLabelAttribute(): string
    {
        return match ($this->crm_stage) {
            'new' => 'Novo Lead',
            'qualifying' => 'Qualificando (IA)',
            'proposal_ready' => 'Pré-Orçamento Pronto',
            'handoff_human' => 'Aguardando Humano',
            'converted' => 'Convertido',
            default => 'Em Atendimento',
        };
    }
}
