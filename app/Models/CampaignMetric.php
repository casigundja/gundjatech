<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class CampaignMetric extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'date',
        'impressions',
        'clicks',
        'conversions',
        'spend',
        'cpc',
        'cpa',
        'roas',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'spend' => 'decimal:2',
        'cpc' => 'decimal:2',
        'cpa' => 'decimal:2',
        'roas' => 'decimal:2',
    ];

    public function getMetricDateAttribute(): ?Carbon
    {
        return $this->date;
    }

    public function getCostPerClickAttribute(): float
    {
        return (float) ($this->attributes['cpc'] ?? 0);
    }

    public function getCostPerAcquisitionAttribute(): float
    {
        return (float) ($this->attributes['cpa'] ?? 0);
    }

    public function campaign()
    {
        return $this->belongsTo(AdvertisingCampaign::class, 'campaign_id');
    }
}
