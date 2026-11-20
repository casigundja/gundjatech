<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PortfolioProject extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'client_name',
        'category',
        'description',
        'challenge',
        'solution',
        'results',
        'cover_image',
        'gallery_images',
        'live_url',
        'is_featured',
        'is_published',
    ];

    protected $casts = [
        'gallery_images' => 'array',
        'is_featured' => 'boolean',
        'is_published' => 'boolean',
    ];
}
