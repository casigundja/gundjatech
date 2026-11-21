<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role',
        'avatar',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function client(): HasOne
    {
        return $this->hasOne(Client::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'manager_id');
    }

    public function projectMemberships(): HasMany
    {
        return $this->hasMany(ProjectMember::class);
    }

    public function serviceRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class);
    }

    public function assignedRequests(): HasMany
    {
        return $this->hasMany(ServiceRequest::class, 'assigned_user_id');
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function blogPosts(): HasMany
    {
        return $this->hasMany(BlogPost::class, 'author_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function notificationsCustom(): HasMany
    {
        return $this->hasMany(NotificationCustom::class);
    }

    public function roleEnum(): UserRole
    {
        return UserRole::tryFrom((string) $this->role) ?? UserRole::Client;
    }

    public function hasRole(string|UserRole ...$roles): bool
    {
        foreach ($roles as $role) {
            $value = $role instanceof UserRole ? $role->value : $role;
            if ($this->role === $value) {
                return true;
            }
        }

        return false;
    }

    /**
     * @var list<string>|null
     */
    private ?array $resolvedPermissions = null;

    public function clearPermissionCache(): void
    {
        $this->resolvedPermissions = null;
        self::clearRolePermissionCache($this->role);
    }

    public static function clearRolePermissionCache(?string $role = null): void
    {
        if ($role !== null) {
            Cache::forget("rbac.role_permissions.{$role}");

            return;
        }

        foreach (UserRole::cases() as $userRole) {
            Cache::forget("rbac.role_permissions.{$userRole->value}");
        }
    }

    public function ensureClientProfile(?string $companyName = null): ?Client
    {
        if ($this->client !== null) {
            return $this->client;
        }

        if (! $this->isClient()) {
            return null;
        }

        $normalizedEmail = strtolower(trim((string) $this->email));

        $existingByEmail = Client::whereRaw('LOWER(email) = ?', [$normalizedEmail])
            ->whereNull('user_id')
            ->where('status', 'lead')
            ->first();

        if ($existingByEmail !== null) {
            $existingByEmail->update([
                'user_id' => $this->id,
                'name' => $existingByEmail->name ?: $this->name,
                'phone' => $existingByEmail->phone ?: $this->phone,
                'status' => 'active',
            ]);
            $this->setRelation('client', $existingByEmail);

            return $existingByEmail;
        }

        $client = Client::create([
            'user_id' => $this->id,
            'name' => $this->name,
            'company_name' => $companyName ?: $this->name,
            'email' => $normalizedEmail,
            'phone' => $this->phone,
            'status' => 'active',
        ]);
        $this->setRelation('client', $client);

        return $client;
    }

    /**
     * @return list<string>
     */
    public function permissions(): array
    {
        if ($this->isSuperAdmin()) {
            return ['*'];
        }

        if ($this->resolvedPermissions !== null) {
            return $this->resolvedPermissions;
        }

        $roleKey = "rbac.role_permissions.{$this->role}";

        $this->resolvedPermissions = Cache::remember($roleKey, 300, function (): array {
            try {
                if (Permission::query()->exists()) {
                    return DB::table('role_permissions')
                        ->join('permissions', 'permissions.id', '=', 'role_permissions.permission_id')
                        ->where('role_permissions.role', $this->role)
                        ->pluck('permissions.slug')
                        ->all();
                }
            } catch (\Throwable) {
                return $this->roleEnum()->defaultPermissions();
            }

            return $this->roleEnum()->defaultPermissions();
        });

        return $this->resolvedPermissions;
    }

    public function hasPermission(string $permission): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->isSuperAdmin()) {
            return true;
        }

        $permissions = $this->permissions();

        return in_array('*', $permissions, true) || in_array($permission, $permissions, true);
    }

    /**
     * @param  list<string>  $permissions
     */
    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === UserRole::SuperAdmin->value;
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [UserRole::SuperAdmin->value, UserRole::Admin->value], true);
    }

    public function isStaff(): bool
    {
        return $this->roleEnum()->isStaff();
    }

    public function isClient(): bool
    {
        return $this->role === UserRole::Client->value;
    }
}
