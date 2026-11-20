<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'user_id',
        'subject',
        'channel',
        'status',
        'closed_at',
    ];

    protected $casts = [
        'closed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
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
}
