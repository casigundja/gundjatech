<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class AccountController extends Controller
{
    public function edit(): View
    {
        /** @var User $user */
        $user = Auth::user();
        $user->load('client');
        $layout = $user->isStaff() ? 'layouts.admin' : 'layouts.portal';

        return view('account.edit', compact('user', 'layout'));
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($user, $validated): void {
            $phone = isset($validated['phone']) && trim((string) $validated['phone']) !== ''
                ? trim((string) $validated['phone'])
                : null;

            $user->update([
                'name' => trim($validated['name']),
                'phone' => $phone,
            ]);

            if ($user->isClient() && $user->client !== null) {
                $clientUpdates = [
                    'name' => $user->name,
                    'phone' => $user->phone,
                ];
                if (! empty($validated['company_name'])) {
                    $clientUpdates['company_name'] = trim($validated['company_name']);
                }
                $user->client->update($clientUpdates);
            }
        });

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'account.profile_updated',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'details' => ['name' => $user->name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Seus dados de perfil foram atualizados com sucesso!');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'current_password.current_password' => 'A senha atual informada está incorreta.',
            'password.confirmed' => 'A confirmação da nova senha não coincide.',
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        if ($request->hasSession()) {
            DB::table('sessions')
                ->where('user_id', $user->id)
                ->where('id', '!=', $request->session()->getId())
                ->delete();
        }

        ActivityLog::create([
            'user_id' => $user->id,
            'action' => 'account.password_updated',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'details' => ['revoked_other_sessions' => true],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Senha alterada com sucesso! Outras sessões ativas foram desconectadas por segurança.');
    }
}
