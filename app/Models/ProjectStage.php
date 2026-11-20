<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectStage extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'title',
        'description',
        'order',
        'status',
        'deadline',
        'completed_at',
    ];

    protected $casts = [
        'deadline' => 'date',
        'completed_at' => 'datetime',
    ];

    public function getNameAttribute(): ?string
    {
        return $this->attributes['title'] ?? null;
    }

    public function getNotesAttribute(): ?string
    {
        return $this->attributes['description'] ?? null;
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pendente',
            'in_progress' => 'Em Andamento',
            'completed' => 'Concluída',
            default => ucfirst(str_replace('_', ' ', (string) $this->status)),
        };
    }
}
