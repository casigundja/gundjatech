<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'stage_id',
        'file_name',
        'file_path',
        'file_size',
        'mime_type',
        'uploaded_by_user_id',
        'is_client_visible',
    ];

    protected $casts = [
        'is_client_visible' => 'boolean',
    ];

    public function getTitleAttribute(): ?string
    {
        return $this->attributes['file_name'] ?? null;
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function stage()
    {
        return $this->belongsTo(ProjectStage::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
