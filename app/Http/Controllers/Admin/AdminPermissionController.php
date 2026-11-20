<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminPermissionController extends Controller
{
    public function index(): View
    {
        $permissionsByModule = Permission::orderBy('module')
            ->orderBy('id')
            ->get()
            ->groupBy('module');

        $roles = UserRole::cases();

        $assignedMatrix = [];
        $pivotRows = DB::table('role_permissions')->get(['role', 'permission_id']);
        foreach ($pivotRows as $row) {
            $assignedMatrix[$row->role][] = (int) $row->permission_id;
        }

        $roleUserCounts = User::select('role', DB::raw('count(*) as total'))
            ->groupBy('role')
            ->pluck('total', 'role')
            ->all();

        $recentAuditLogs = ActivityLog::with('user')
            ->where('action', 'like', 'permissions.%')
            ->latest()
            ->take(5)
            ->get();

        $moduleLabels = [
            'dashboard' => 'Dashboard Executivo',
            'clients' => 'Gestão de Clientes',
            'requests' => 'Solicitações de Serviço',
            'quotations' => 'Orçamentos & Propostas',
            'projects' => 'Projetos & Entregas',
            'services' => 'Catálogo de Serviços',
            'domains' => 'Domínios & DNS',
            'campaigns' => 'Tráfego Pago',
            'finance' => 'Financeiro & Faturas',
            'chat' => 'Atendimento & Chat',
            'users' => 'Usuários & Equipe',
            'settings' => 'Configurações & RBAC',
            'portal' => 'Portal do Cliente',
        ];

        return view('admin.permissions.index', compact(
            'permissionsByModule',
            'roles',
            'assignedMatrix',
            'roleUserCounts',
            'recentAuditLogs',
            'moduleLabels'
        ));
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['array'],
            'permissions.*.*' => ['integer', 'exists:permissions,id'],
        ]);

        $submitted = $validated['permissions'] ?? [];
        $allPermissionIds = Permission::pluck('id')->map(fn ($id): int => (int) $id)->all();
        $settingsManageId = Permission::where('slug', 'settings.manage')->value('id');
        $currentUser = Auth::user();

        if (
            $currentUser
            && ! $currentUser->isSuperAdmin()
            && $settingsManageId !== null
        ) {
            $ownSubmitted = array_map('intval', $submitted[$currentUser->role] ?? []);
            if (! in_array((int) $settingsManageId, $ownSubmitted, true)) {
                return back()->with('error', 'Você não pode remover a permissão de Configurações (RBAC) do seu próprio cargo.');
            }
        }

        $now = now();

        DB::transaction(function () use ($submitted, $allPermissionIds, $now): void {
            $editableRoles = array_filter(
                UserRole::cases(),
                fn (UserRole $role): bool => $role !== UserRole::SuperAdmin
            );

            $editableRoleValues = array_map(fn (UserRole $r): string => $r->value, $editableRoles);
            DB::table('role_permissions')->whereIn('role', $editableRoleValues)->delete();

            $rowsToInsert = [];

            foreach ($editableRoles as $role) {
                $roleIds = array_unique(array_map('intval', $submitted[$role->value] ?? []));
                $validIds = array_intersect($roleIds, $allPermissionIds);

                foreach ($validIds as $permissionId) {
                    $rowsToInsert[] = [
                        'role' => $role->value,
                        'permission_id' => $permissionId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            if (! empty($rowsToInsert)) {
                DB::table('role_permissions')->insert($rowsToInsert);
            }

            // Guarantee SuperAdmin retains every permission in DB
            $superRows = array_map(fn (int $pid): array => [
                'role' => UserRole::SuperAdmin->value,
                'permission_id' => $pid,
                'created_at' => $now,
                'updated_at' => $now,
            ], $allPermissionIds);

            if (! empty($superRows)) {
                DB::table('role_permissions')->upsert($superRows, ['role', 'permission_id'], ['updated_at']);
            }
        });

        Auth::user()?->clearPermissionCache();
        User::clearRolePermissionCache();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'permissions.matrix_updated',
            'subject_type' => Permission::class,
            'subject_id' => null,
            'details' => [
                'roles_updated' => array_keys($submitted),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.permissions.index')
            ->with('success', 'Matriz de permissões RBAC atualizada com sucesso!');
    }

    public function resetDefaults(Request $request): RedirectResponse
    {
        $permissionMap = Permission::pluck('id', 'slug')->all();
        $now = now();

        DB::transaction(function () use ($permissionMap, $now): void {
            DB::table('role_permissions')->delete();

            $rows = [];
            foreach (UserRole::cases() as $role) {
                $slugs = $role === UserRole::SuperAdmin
                    ? array_keys($permissionMap)
                    : $role->defaultPermissions();

                foreach ($slugs as $slug) {
                    if (! isset($permissionMap[$slug])) {
                        continue;
                    }

                    $rows[] = [
                        'role' => $role->value,
                        'permission_id' => (int) $permissionMap[$slug],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }

            if (! empty($rows)) {
                DB::table('role_permissions')->insert($rows);
            }
        });

        Auth::user()?->clearPermissionCache();
        User::clearRolePermissionCache();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'permissions.reset_defaults',
            'subject_type' => Permission::class,
            'subject_id' => null,
            'details' => ['restored_by' => Auth::user()?->email],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.permissions.index')
            ->with('success', 'Permissões padrão restauradas para todos os cargos!');
    }
}
