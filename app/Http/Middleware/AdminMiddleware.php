<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return redirect()->route('login')->with('warning', 'Faça login para acessar o painel administrativo.');
        }

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Sua conta de usuário está desativada.');
        }

        if (! $user->isStaff()) {
            return redirect()->route('portal.dashboard')->with('error', 'Acesso restrito à equipe interna da GundjaTech.');
        }

        return $next($request);
    }
}
