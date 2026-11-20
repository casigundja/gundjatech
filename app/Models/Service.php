<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'service_category_id',
        'name',
        'slug',
        'short_description',
        'full_description',
        'description',
        'icon',
        'image',
        'base_price',
        'starting_price',
        'billing_type',
        'estimated_days',
        'estimated_delivery_days',
        'features',
        'is_featured',
        'is_active',
    ];

    protected $casts = [
        'features' => 'array',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'base_price' => 'decimal:2',
    ];

    // Aliases
    public function getStartingPriceAttribute(): ?float
    {
        return isset($this->attributes['base_price']) ? (float) $this->attributes['base_price'] : 0.0;
    }

    public function setStartingPriceAttribute($value): void
    {
        $this->attributes['base_price'] = $value;
    }

    public function getDescriptionAttribute(): ?string
    {
        return $this->attributes['full_description'] ?? $this->attributes['short_description'] ?? null;
    }

    public function setDescriptionAttribute(?string $value): void
    {
        $this->attributes['full_description'] = $value;
    }

    public function getEstimatedDeliveryDaysAttribute(): ?int
    {
        return $this->attributes['estimated_days'] ?? 10;
    }

    public function setEstimatedDeliveryDaysAttribute(?int $value): void
    {
        $this->attributes['estimated_days'] = $value;
    }

    public function getServiceCategoryIdAttribute(): ?int
    {
        return $this->attributes['category_id'] ?? null;
    }

    public function setServiceCategoryIdAttribute(?int $value): void
    {
        $this->attributes['category_id'] = $value;
    }

    public function category()
    {
        return $this->belongsTo(ServiceCategory::class, 'category_id');
    }

    public function requests()
    {
        return $this->hasMany(ServiceRequest::class);
    }

    public function projects()
    {
        return $this->hasMany(Project::class);
    }
}
