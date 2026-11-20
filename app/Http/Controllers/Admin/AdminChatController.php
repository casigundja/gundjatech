<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class AdminChatController extends Controller
{
    public function index(Request $request): View
    {
        $query = Conversation::with(['client', 'assignedStaff', 'latestMessage'])
            ->withCount(['messages as unread_client_count' => function ($q): void {
                $q->where('sender_type', 'client')->where('is_read', false);
            }])
            ->orderBy('updated_at', 'desc');

        $statusFilter = $request->query('status');
        if ($statusFilter === 'open') {
            $query->whereIn('status', ['open', 'waiting_staff']);
        } elseif ($statusFilter === 'ai_active') {
            $query->where('ai_enabled', true)->where('status', '!=', 'closed');
        } elseif (in_array($statusFilter, ['waiting_staff', 'waiting_client', 'closed'], true)) {
            $query->where('status', $statusFilter);
        }

        $conversations = $query->get();

        $activeConversation = null;
        if ($request->filled('conversation_id')) {
            $activeConversation = Conversation::with(['messages.sender', 'client', 'assignedStaff', 'serviceRequest.quotation'])
                ->find($request->conversation_id);
        } elseif ($conversations->isNotEmpty()) {
            $activeConversation = $conversations->first();
            $activeConversation->load(['messages.sender', 'client', 'assignedStaff', 'serviceRequest.quotation']);
        }

        if ($activeConversation !== null) {
            $activeConversation->messages()
                ->where('sender_type', 'client')
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }

        $clients = Client::whereIn('status', ['active', 'lead'])
            ->orderBy('company_name')
            ->get();

        return view('admin.chat.index', compact('conversations', 'activeConversation', 'clients'));
    }

    public function summary(Request $request): JsonResponse
    {
        $counts = DB::selectOne(
            "SELECT
                (SELECT COUNT(*) FROM service_requests WHERE status IN ('new', 'analyzing', 'awaiting_info')) AS pending_requests,
                (SELECT COALESCE(MAX(id), 0) FROM service_requests) AS latest_request_id,
                (SELECT COUNT(*) FROM conversations WHERE status != 'closed') AS open_chats,
                (SELECT COUNT(*) FROM conversations WHERE status = 'waiting_staff') AS waiting_staff,
                (SELECT COUNT(*) FROM conversations WHERE ai_enabled = true AND status != 'closed') AS ai_active_chats,
                (SELECT COUNT(*) FROM conversation_messages WHERE sender_type = 'client' AND is_read = false) AS unread_client_messages,
                (SELECT COALESCE(MAX(id), 0) FROM conversation_messages WHERE sender_type = 'client') AS latest_client_message_id,
                (SELECT COALESCE(MAX(id), 0) FROM conversations) AS latest_conversation_id"
        );

        $payload = [
            'ok' => true,
            'pending_requests' => (int) ($counts->pending_requests ?? 0),
            'latest_request_id' => (int) ($counts->latest_request_id ?? 0),
            'open_chats' => (int) ($counts->open_chats ?? 0),
            'waiting_staff' => (int) ($counts->waiting_staff ?? 0),
            'ai_active_chats' => (int) ($counts->ai_active_chats ?? 0),
            'unread_client_messages' => (int) ($counts->unread_client_messages ?? 0),
            'latest_client_message_id' => (int) ($counts->latest_client_message_id ?? 0),
            'latest_conversation_id' => (int) ($counts->latest_conversation_id ?? 0),
        ];

        if ($request->boolean('counts_only')) {
            return response()->json($payload);
        }

        $query = Conversation::with(['client', 'latestMessage'])
            ->withCount(['messages as unread_client_count' => function ($q): void {
                $q->where('sender_type', 'client')->where('is_read', false);
            }])
            ->orderBy('updated_at', 'desc');

        $statusFilter = $request->query('status');
        if ($statusFilter === 'open') {
            $query->whereIn('status', ['open', 'waiting_staff']);
        } elseif ($statusFilter === 'ai_active') {
            $query->where('ai_enabled', true)->where('status', '!=', 'closed');
        } elseif (in_array($statusFilter, ['waiting_staff', 'waiting_client', 'closed'], true)) {
            $query->where('status', $statusFilter);
        }

        $payload['conversations'] = $query->take(50)->get()->map(static function (Conversation $conv) use ($statusFilter): array {
            $name = $conv->visitor_name ?: ($conv->client?->display_name ?? 'Visitante');
            $routeParams = ['conversation_id' => $conv->id];
            if (is_string($statusFilter) && $statusFilter !== '') {
                $routeParams['status'] = $statusFilter;
            }

            return [
                'id' => $conv->id,
                'name' => $name,
                'subject' => $conv->subject,
                'latest_message' => $conv->latestMessage?->message ?? 'Nenhuma mensagem',
                'channel' => $conv->channel,
                'channel_label' => $conv->channel === 'website_chat' ? 'Site' : 'Portal',
                'status' => $conv->status,
                'status_label' => $conv->status_label,
                'ai_enabled' => (bool) $conv->ai_enabled,
                'crm_stage' => $conv->crm_stage,
                'crm_stage_label' => $conv->crm_stage_label,
                'lead_score' => (int) $conv->lead_score,
                'unread_client_count' => (int) ($conv->unread_client_count ?? 0),
                'updated_at' => $conv->updated_at?->format('H:i') ?? '',
                'url' => route('admin.chat.index', $routeParams),
            ];
        })->values()->all();

        return response()->json($payload);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $afterId = (int) $request->query('after_id', 0);

        $conversation->messages()
            ->where('sender_type', 'client')
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        $query = $conversation->messages()->with('sender');
        if ($afterId > 0) {
            $query->where('id', '>', $afterId);
        }

        $messages = $query->get()->map(static function (ConversationMessage $msg): array {
            $isStaff = $msg->sender_type === 'staff';

            return [
                'id' => $msg->id,
                'sender_type' => $msg->sender_type,
                'sender_name' => $msg->sender?->name ?? $msg->sender_name ?? ($isStaff ? 'Equipe GundjaTech' : 'Visitante'),
                'is_ai' => (bool) $msg->is_ai,
                'message' => $msg->message,
                'created_at' => $msg->created_at?->format('d/m H:i') ?? '',
            ];
        })->values()->all();

        return response()->json([
            'ok' => true,
            'conversation_id' => $conversation->id,
            'status' => $conversation->status,
            'status_label' => $conversation->status_label,
            'ai_enabled' => (bool) $conversation->ai_enabled,
            'crm_stage' => $conversation->crm_stage,
            'crm_stage_label' => $conversation->crm_stage_label,
            'lead_score' => (int) $conversation->lead_score,
            'ai_summary' => $conversation->ai_summary,
            'messages' => $messages,
        ]);
    }

    public function startConversation(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string', 'max:3000'],
        ]);

        $conversation = DB::transaction(function () use ($validated): Conversation {
            $conversation = Conversation::create([
                'client_id' => $validated['client_id'],
                'user_id' => Auth::id(),
                'subject' => $validated['subject'],
                'channel' => 'web_chat',
                'status' => 'waiting_client',
                'ai_enabled' => false,
                'crm_stage' => 'handoff_human',
            ]);

            ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'staff',
                'sender_name' => Auth::user()->name,
                'is_ai' => false,
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            return $conversation;
        });

        return redirect()->route('admin.chat.index', ['conversation_id' => $conversation->id])
            ->with('success', 'Novo atendimento iniciado com o cliente!');
    }

    public function sendMessage(Request $request, Conversation $conversation): RedirectResponse|JsonResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);

        /** @var ConversationMessage $createdMessage */
        $createdMessage = DB::transaction(function () use ($conversation, $validated): ConversationMessage {
            $createdMessage = ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'staff',
                'sender_name' => Auth::user()->name,
                'is_ai' => false,
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            // Automatic human takeover: pause AI autopilot when a human attendant replies
            $conversation->update([
                'user_id' => Auth::id(),
                'ai_enabled' => false,
                'status' => 'waiting_client',
                'closed_at' => null,
            ]);
            $conversation->touch();

            return $createdMessage;
        });

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'status' => $conversation->status,
                'status_label' => $conversation->status_label,
                'ai_enabled' => false,
                'message' => [
                    'id' => $createdMessage->id,
                    'sender_type' => 'staff',
                    'sender_name' => Auth::user()->name,
                    'is_ai' => false,
                    'message' => $createdMessage->message,
                    'created_at' => $createdMessage->created_at?->format('d/m H:i') ?? '',
                ],
            ]);
        }

        return redirect()->route('admin.chat.index', ['conversation_id' => $conversation->id])
            ->with('success', 'Mensagem enviada! (Piloto Automático IA pausado para atendimento humano.)');
    }

    public function toggleAi(Conversation $conversation): RedirectResponse
    {
        $nextState = ! (bool) $conversation->ai_enabled;
        $conversation->update([
            'ai_enabled' => $nextState,
            'crm_stage' => $nextState && $conversation->crm_stage === 'handoff_human' ? 'qualifying' : $conversation->crm_stage,
        ]);

        return redirect()->route('admin.chat.index', ['conversation_id' => $conversation->id])
            ->with('success', $nextState
                ? 'Piloto Automático IA reativado para esta conversa!'
                : 'Atendimento assumido por humano (IA pausada nesta conversa).');
    }

    public function closeConversation(Conversation $conversation): RedirectResponse
    {
        $conversation->update([
            'status' => 'closed',
            'ai_enabled' => false,
            'closed_at' => now(),
        ]);

        return redirect()->route('admin.chat.index', ['conversation_id' => $conversation->id])
            ->with('success', 'Atendimento finalizado.');
    }

    public function reopenConversation(Conversation $conversation): RedirectResponse
    {
        $conversation->update([
            'status' => 'open',
            'closed_at' => null,
            'user_id' => Auth::id(),
        ]);

        return redirect()->route('admin.chat.index', ['conversation_id' => $conversation->id])
            ->with('success', 'Atendimento reaberto!');
    }
}
