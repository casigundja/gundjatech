<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RequestStatusHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'service_request_id',
        'user_id',
        'old_status',
        'new_status',
        'comment',
    ];

    public function request()
    {
        return $this->belongsTo(ServiceRequest::class, 'service_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getNewStatusLabelAttribute(): string
    {
        return match ($this->new_status) {
            'new' => 'Nova Solicitação',
            'analyzing' => 'Em Análise',
            'awaiting_info', 'waiting_info' => 'Aguardando Informações',
            'quotation_sent', 'quoted' => 'Orçamento Enviado',
            'awaiting_approval' => 'Aguardando Aprovação',
            'approved' => 'Aprovada',
            'in_progress' => 'Em Execução',
            'completed' => 'Concluída',
            'cancelled' => 'Cancelada',
            default => ucfirst(str_replace('_', ' ', (string) $this->new_status)),
        };
    }
}
