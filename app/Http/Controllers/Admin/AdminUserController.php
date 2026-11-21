<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\BlogPost;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class AdminUserController extends Controller
{
    public function index(Request $request): View
    {
        $query = User::query();

        if ($request->filled('search')) {
            $like = '%'.mb_strtolower(trim((string) $request->search)).'%';
            $query->where(function ($q) use ($like): void {
                $q->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        $users = $query->orderBy('name')->paginate(12)->withQueryString();
        $roles = UserRole::visibleRoles();

        return view('admin.users.index', compact('users', 'roles'));
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'in:superadmin,admin,manager,attendant,developer,financial,client'],
            'password' => ['required', Password::min(6)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $actor = Auth::user();
        $actorRole = UserRole::tryFrom((string) $actor->role) ?? UserRole::Client;
        $targetRole = UserRole::from($validated['role']);

        if (! $actor->isSuperAdmin() && $targetRole->level() >= $actorRole->level()) {
            return back()->with('error', 'Você não tem permissão para criar um usuário com cargo igual ou superior ao seu.');
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
        ]);

        if ($user->isClient()) {
            $user->ensureClientProfile();
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user.created',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'details' => ['email' => $user->email, 'role' => $user->role],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.users.index')->with('success', 'Usuário criado com sucesso!');
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $actor = Auth::user();
        $actorRole = UserRole::tryFrom((string) $actor->role) ?? UserRole::Client;
        $currentTargetRole = UserRole::tryFrom((string) $user->role) ?? UserRole::Client;

        if (! $actor->isSuperAdmin() && $user->id !== $actor->id && $currentTargetRole->level() >= $actorRole->level()) {
            return back()->with('error', 'Você não tem permissão para alterar a conta de um usuário com cargo igual ou superior ao seu.');
        }

        $request->merge([
            'email' => strtolower(trim((string) $request->input('email'))),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'in:superadmin,admin,manager,attendant,developer,financial,client'],
            'is_active' => ['nullable', 'boolean'],
            'password' => ['nullable', Password::min(6)],
        ]);

        $newTargetRole = UserRole::from($validated['role']);
        $isActive = $request->has('is_active') ? $request->boolean('is_active') : false;

        if ($user->id === $actor->id && ! $isActive) {
            return back()->with('error', 'Você não pode desativar sua própria conta enquanto estiver logado.');
        }

        if ($user->id === $actor->id && $validated['role'] !== $user->role) {
            return back()->with('error', 'Você não pode alterar o seu próprio cargo.');
        }

        if (! $actor->isSuperAdmin() && $user->id !== $actor->id && $newTargetRole->level() >= $actorRole->level()) {
            return back()->with('error', 'Você não tem permissão para atribuir um cargo igual ou superior ao seu.');
        }

        $passwordChanged = ! empty($validated['password']);
        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'is_active' => $isActive,
        ];

        if ($passwordChanged) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        if ($passwordChanged || ! $isActive) {
            $sessionQuery = DB::table('sessions')->where('user_id', $user->id);
            if ($user->id === $actor->id && $request->hasSession()) {
                $sessionQuery->where('id', '!=', $request->session()->getId());
            }
            $sessionQuery->delete();
        }

        if ($user->isClient()) {
            $user->ensureClientProfile();
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'user.updated',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'details' => [
                'email' => $user->email,
                'role' => $user->role,
                'is_active' => $user->is_active,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.users.index')->with('success', 'Usuário atualizado com sucesso!');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        $actor = Auth::user();
        $actorRole = UserRole::tryFrom((string) $actor->role) ?? UserRole::Client;
        $targetRole = UserRole::tryFrom((string) $user->role) ?? UserRole::Client;

        if ($user->id === $actor->id) {
            return back()->with('error', 'Você não pode excluir sua própria conta enquanto estiver logado.');
        }

        if (! $actor->isSuperAdmin() && $targetRole->level() >= $actorRole->level()) {
            return back()->with('error', 'Você não tem permissão para excluir um usuário com cargo igual ou superior ao seu.');
        }

        if (
            $user->isSuperAdmin()
            && User::where('role', UserRole::SuperAdmin->value)
                ->where('is_active', true)
                ->where('id', '!=', $user->id)
                ->doesntExist()
        ) {
            return back()->with('error', 'Não é possível excluir o último Super Administrador ativo do sistema.');
        }

        $deletedId = $user->id;
        $deletedName = $user->name;
        $deletedEmail = $user->email;
        $deletedRole = $user->role;
        $actingAdminId = (int) Auth::id();

        DB::transaction(function () use ($user, $actingAdminId): void {
            Quotation::where('user_id', $user->id)->update(['user_id' => $actingAdminId]);
            BlogPost::where('author_id', $user->id)->update(['author_id' => $actingAdminId]);
            DB::table('sessions')->where('user_id', $user->id)->delete();
            $user->delete();
        });

        ActivityLog::create([
            'user_id' => $actingAdminId,
            'action' => 'user.deleted',
            'subject_type' => User::class,
            'subject_id' => $deletedId,
            'details' => [
                'name' => $deletedName,
                'email' => $deletedEmail,
                'role' => $deletedRole,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', "Usuário {$deletedName} excluído com sucesso.");
    }
}
