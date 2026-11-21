<?php

namespace App\Providers;

use App\Models\Conversation;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

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
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

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
            $notificationItems = [];
            $user = Auth::user();

            if ($user instanceof User) {
                $canViewRequests = $user->hasPermission('requests.view');
                $canManageRequests = $user->hasPermission('requests.manage');
                $canViewChats = $user->hasPermission('chat.view');
                $canManageChats = $user->hasPermission('chat.manage');

                if ($canViewRequests || $canViewChats) {
                    try {
                        $requestsExpr = $canViewRequests
                            ? "(SELECT COUNT(*) FROM service_requests WHERE status IN ('new', 'analyzing', 'awaiting_info'))"
                            : '0';
                        $chatsExpr = $canViewChats
                            ? "(SELECT COUNT(*) FROM conversations WHERE status != 'closed')"
                            : '0';

                        $counts = DB::selectOne("SELECT {$requestsExpr} AS pending_requests, {$chatsExpr} AS open_chats");
                        $pendingRequestsCount = (int) ($counts->pending_requests ?? 0);
                        $openChatsCount = (int) ($counts->open_chats ?? 0);

                        $items = collect();

                        if ($canViewRequests && $pendingRequestsCount > 0) {
                            $recentReqs = ServiceRequest::with('client')
                                ->whereIn('status', ['new', 'analyzing', 'awaiting_info'])
                                ->latest('created_at')
                                ->take(4)
                                ->get();

                            foreach ($recentReqs as $req) {
                                $contact = $req->contact_name ?: ($req->client?->display_name ?? 'Cliente');
                                $title = $req->title ?: ('Solicitação '.$req->protocol);
                                $items->push([
                                    'id' => $req->id,
                                    'key' => 'request:'.$req->id,
                                    'type' => 'request',
                                    'title' => $title,
                                    'subtitle' => $req->protocol.' • '.$contact,
                                    'badge' => $req->status_label,
                                    'badge_tone' => $req->status === 'new' ? 'gold' : 'blue',
                                    'time' => $req->created_at?->format('d/m H:i') ?? '',
                                    'sort_ts' => $req->created_at?->getTimestamp() ?? 0,
                                    'url' => route('admin.requests.show', $req),
                                    'can_delete' => $canManageRequests,
                                    'delete_url' => route('admin.requests.destroy', $req),
                                    'confirm_title' => 'Excluir solicitação',
                                    'confirm_message' => 'Tem certeza que deseja excluir permanentemente esta solicitação e seus anexos para não sobrecarregar o banco? Esta ação não pode ser desfeita.',
                                    'confirm_target' => $req->protocol.' • '.$title,
                                    'confirm_button' => 'Sim, excluir solicitação',
                                ]);
                            }
                        }

                        if ($canViewChats && $openChatsCount > 0) {
                            $recentChats = Conversation::with(['client', 'latestMessage'])
                                ->where('status', '!=', 'closed')
                                ->latest('updated_at')
                                ->take(4)
                                ->get();

                            foreach ($recentChats as $conv) {
                                $leadName = $conv->visitor_name ?: ($conv->client?->display_name ?? 'Visitante');
                                $preview = Str::limit((string) ($conv->latestMessage?->message ?? $conv->subject), 58);
                                $items->push([
                                    'id' => $conv->id,
                                    'key' => 'chat:'.$conv->id,
                                    'type' => 'chat',
                                    'title' => 'Chat • '.$leadName,
                                    'subtitle' => $preview,
                                    'badge' => $conv->status === 'waiting_staff' ? 'Aguardando Equipe' : ($conv->ai_enabled ? 'Piloto IA' : $conv->status_label),
                                    'badge_tone' => $conv->status === 'waiting_staff' ? 'amber' : 'emerald',
                                    'time' => $conv->updated_at?->format('d/m H:i') ?? '',
                                    'sort_ts' => $conv->updated_at?->getTimestamp() ?? 0,
                                    'url' => route('admin.chat.index', ['conversation_id' => $conv->id]),
                                    'can_delete' => $canManageChats,
                                    'delete_url' => route('admin.chat.destroy', $conv),
                                    'confirm_title' => 'Excluir conversa de atendimento',
                                    'confirm_message' => 'Tem certeza que deseja excluir permanentemente esta conversa e todo o histórico de mensagens do banco de dados?',
                                    'confirm_target' => 'Chat • '.$leadName,
                                    'confirm_button' => 'Sim, excluir conversa',
                                ]);
                            }
                        }

                        $notificationItems = $items
                            ->sortByDesc('sort_ts')
                            ->take(6)
                            ->values()
                            ->all();
                    } catch (\Throwable) {
                        $pendingRequestsCount = 0;
                        $openChatsCount = 0;
                        $notificationItems = [];
                    }
                }
            }

            $view->with([
                'adminPendingRequestsCount' => $pendingRequestsCount,
                'adminOpenChatsCount' => $openChatsCount,
                'adminNotificationItems' => $notificationItems,
            ]);
        });
    }
}
