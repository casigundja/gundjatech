<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        $roles = UserRole::cases();

        return view('admin.users.index', compact('users', 'roles'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'in:superadmin,admin,manager,attendant,developer,financial,client'],
            'password' => ['required', Password::min(6)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($validated['role'] === UserRole::SuperAdmin->value && ! Auth::user()->isSuperAdmin()) {
            return back()->with('error', 'Apenas Super Administradores podem criar outro Super Administrador.');
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
        if ($user->isSuperAdmin() && ! Auth::user()->isSuperAdmin()) {
            return back()->with('error', 'Apenas Super Administradores podem alterar a conta de um Super Administrador.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'in:superadmin,admin,manager,attendant,developer,financial,client'],
            'is_active' => ['nullable', 'boolean'],
            'password' => ['nullable', Password::min(6)],
        ]);

        $isActive = $request->has('is_active') ? $request->boolean('is_active') : false;

        if ($user->id === Auth::id() && ! $isActive) {
            return back()->with('error', 'Você não pode desativar sua própria conta enquanto estiver logado.');
        }

        if ($user->id === Auth::id() && $user->isSuperAdmin() && $validated['role'] !== UserRole::SuperAdmin->value) {
            return back()->with('error', 'Você não pode remover seu próprio cargo de Super Administrador.');
        }

        if ($validated['role'] === UserRole::SuperAdmin->value && ! Auth::user()->isSuperAdmin()) {
            return back()->with('error', 'Apenas Super Administradores podem atribuir o cargo de Super Administrador.');
        }

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'is_active' => $isActive,
        ];

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

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
}
