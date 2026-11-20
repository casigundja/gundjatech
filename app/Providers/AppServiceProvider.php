<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config('database.default') === 'pgsql') {
            $host = (string) config('database.connections.pgsql.host', '');
            if (preg_match('/^db\.([a-z0-9]+)\.supabase\.co$/i', $host, $matches)) {
                $projectRef = $matches[1];
                $needsPooler = Cache::store('file')->remember(
                    'supabase_ipv4_fallback_'.$projectRef,
                    3600,
                    static fn (): bool => @gethostbyname($host) === $host
                );
                if ($needsPooler) {
                    config([
                        'database.connections.pgsql.url' => null,
                        'database.connections.pgsql.host' => 'aws-0-us-west-2.pooler.supabase.com',
                        'database.connections.pgsql.username' => 'postgres.'.$projectRef,
                        'database.connections.pgsql.sslmode' => 'require',
                    ]);
                }
            }
        }

        Gate::before(function (User $user, string $ability): ?bool {
            if ($user->is_active && $user->isSuperAdmin()) {
                return true;
            }

            if (str_contains($ability, '.')) {
                return $user->hasPermission($ability);
            }

            return null;
        });

        View::composer('layouts.admin', function ($view): void {
            $pendingRequestsCount = 0;
            $openChatsCount = 0;

            if (Auth::check()) {
                try {
                    $counts = DB::selectOne(
                        "SELECT
                            (SELECT COUNT(*) FROM service_requests WHERE status IN ('new', 'analyzing', 'awaiting_info')) AS pending_requests,
                            (SELECT COUNT(*) FROM conversations WHERE status != 'closed') AS open_chats"
                    );
                    $pendingRequestsCount = (int) ($counts->pending_requests ?? 0);
                    $openChatsCount = (int) ($counts->open_chats ?? 0);
                } catch (\Throwable) {
                    $pendingRequestsCount = 0;
                    $openChatsCount = 0;
                }
            }

            $view->with([
                'adminPendingRequestsCount' => $pendingRequestsCount,
                'adminOpenChatsCount' => $openChatsCount,
            ]);
        });
    }
}
