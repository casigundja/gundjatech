<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Permission extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'module',
        'description',
    ];

    /**
     * @return list<string>
     */
    public function assignedRoles(): array
    {
        return DB::table('role_permissions')
            ->where('permission_id', $this->id)
            ->pluck('role')
            ->all();
    }
}
