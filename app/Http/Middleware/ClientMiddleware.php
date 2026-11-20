<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ClientMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return redirect()->route('login')->with('warning', 'Faça login para acessar o portal do cliente.');
        }

        $user = Auth::user();

        if (! $user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Sua conta de usuário está desativada.');
        }

        if (! $user->isAdmin() && ! $user->hasPermission('portal.access')) {
            abort(403, 'Você não possui permissão para acessar o Portal do Cliente.');
        }

        return $next($request);
    }
}
