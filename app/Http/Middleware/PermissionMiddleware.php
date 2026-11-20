<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class PermissionMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (! Auth::check()) {
            return redirect()->route('login')->with('warning', 'Faça login para continuar.');
        }

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Sua conta de usuário está desativada.');
        }

        if ($user->isAdmin() && str_starts_with($permission, 'portal.')) {
            return $next($request);
        }

        if (! $user->hasPermission($permission)) {
            abort(403, 'Você não possui permissão para acessar este recurso.');
        }

        return $next($request);
    }
}
