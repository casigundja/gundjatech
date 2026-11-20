<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function showLogin(): View|RedirectResponse
    {
        if (Auth::check()) {
            return $this->redirectBasedOnRole(Auth::user());
        }

        return view('auth.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $remember = $request->boolean('remember');

        if (Auth::attempt($credentials, $remember)) {
            $request->session()->regenerate();
            $user = Auth::user();

            if (! $user->is_active) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return back()->withErrors(['email' => 'Esta conta de usuário está desativada.']);
            }

            return $this->redirectBasedOnRole($user);
        }

        return back()->withErrors([
            'email' => 'As credenciais informadas não correspondem aos nossos registros.',
        ])->onlyInput('email');
    }

    public function showRegister(): View|RedirectResponse
    {
        if (Auth::check()) {
            return $this->redirectBasedOnRole(Auth::user());
        }

        return view('auth.register');
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::min(6)],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user = DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
                'role' => 'client',
                'is_active' => true,
            ]);

            $normalizedEmail = strtolower(trim($data['email']));

            $existingClient = Client::whereRaw('LOWER(email) = ?', [$normalizedEmail])
                ->whereNull('user_id')
                ->first();

            if ($existingClient !== null) {
                $existingClient->update([
                    'user_id' => $user->id,
                    'name' => $data['name'],
                    'company_name' => $data['company_name'] ?: ($existingClient->company_name ?: $data['name']),
                    'phone' => $data['phone'] ?? $existingClient->phone,
                    'status' => 'active',
                ]);
                $client = $existingClient;
            } else {
                $client = Client::create([
                    'user_id' => $user->id,
                    'name' => $data['name'],
                    'company_name' => $data['company_name'] ?: $data['name'],
                    'email' => $normalizedEmail,
                    'phone' => $data['phone'] ?? null,
                    'status' => 'active',
                ]);
            }

            ServiceRequest::whereRaw('LOWER(email) = ?', [$normalizedEmail])
                ->where(function ($q): void {
                    $q->whereNull('client_id')->orWhereNull('user_id');
                })
                ->update([
                    'client_id' => $client->id,
                    'user_id' => $user->id,
                ]);

            Conversation::whereRaw('LOWER(visitor_email) = ?', [$normalizedEmail])
                ->where('client_id', '!=', $client->id)
                ->update(['client_id' => $client->id]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('portal.dashboard')->with('success', 'Cadastro realizado com sucesso! Seja bem-vindo à GundjaTech.');
    }

    public function showForgotPassword(): View
    {
        return view('auth.forgot-password');
    }

    public function sendResetLink(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = PasswordBroker::sendResetLink($request->only('email'));

        if ($status === PasswordBroker::RESET_LINK_SENT) {
            return back()->with('status', 'Enviamos um link de redefinição de senha para o seu e-mail.');
        }

        return back()->withErrors(['email' => 'Não encontramos um usuário com este endereço de e-mail.']);
    }

    public function showResetPassword(Request $request, string $token): View
    {
        return view('auth.reset-password', [
            'token' => $token,
            'email' => $request->query('email', ''),
        ]);
    }

    public function resetPassword(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(6)],
        ]);

        $status = PasswordBroker::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status === PasswordBroker::PASSWORD_RESET) {
            return redirect()->route('login')->with('status', 'Sua senha foi redefinida com sucesso! Faça login com a nova senha.');
        }

        return back()->withErrors(['email' => 'Token de redefinição inválido ou expirado.']);
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home')->with('success', 'Sessão encerrada com segurança.');
    }

    private function redirectBasedOnRole(User $user): RedirectResponse
    {
        $intended = session()->get('url.intended');
        $intendedHost = is_string($intended) ? parse_url($intended, PHP_URL_HOST) : null;
        $intendedPath = is_string($intended) ? (string) parse_url($intended, PHP_URL_PATH) : '';
        $appHost = parse_url(url('/'), PHP_URL_HOST);
        $isSameHost = $intendedHost === null || $intendedHost === $appHost;

        if (! $user->isStaff()) {
            if ($isSameHost && str_starts_with($intendedPath, '/portal')) {
                return redirect()->intended(route('portal.dashboard'));
            }

            return redirect()->route('portal.dashboard');
        }

        if ($isSameHost && str_starts_with($intendedPath, '/admin')) {
            return redirect()->intended(route('admin.dashboard'));
        }

        return redirect()->route('admin.dashboard');
    }
}
