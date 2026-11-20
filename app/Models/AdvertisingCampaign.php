<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdvertisingCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'name',
        'platform',
        'status',
        'budget',
        'spent',
        'start_date',
        'end_date',
        'target_audience',
        'objective',
        'notes',
    ];

    protected $casts = [
        'budget' => 'decimal:2',
        'spent' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function metrics()
    {
        return $this->hasMany(CampaignMetric::class, 'campaign_id')->orderBy('date', 'desc');
    }

    public function latestMetrics()
    {
        return $this->hasOne(CampaignMetric::class, 'campaign_id')->latestOfMany('date');
    }

    public function getPlatformLabelAttribute(): string
    {
        return match ($this->platform) {
            'meta_ads' => 'Meta Ads (Facebook & Instagram)',
            'google_ads' => 'Google Ads',
            'tiktok_ads' => 'TikTok Ads',
            'linkedin_ads' => 'LinkedIn Ads',
            default => $this->platform,
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Rascunho',
            'active' => 'Ativa',
            'paused' => 'Pausada',
            'ended' => 'Encerrada',
            default => ucfirst((string) $this->status),
        };
    }
}
