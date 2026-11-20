<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'icon',
        'order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getSortOrderAttribute()
    {
        return $this->order;
    }

    public function setSortOrderAttribute($value): void
    {
        $this->attributes['order'] = $value;
    }

    public function services()
    {
        return $this->hasMany(Service::class, 'category_id')->orderBy('name');
    }
}
