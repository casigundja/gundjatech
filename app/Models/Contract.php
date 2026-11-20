<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contract extends Model
{
    use HasFactory;

    protected $fillable = [
        'contract_number',
        'client_id',
        'project_id',
        'quotation_id',
        'title',
        'content',
        'total_value',
        'start_date',
        'end_date',
        'status',
        'signed_at',
    ];

    protected $casts = [
        'total_value' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'signed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }
}
