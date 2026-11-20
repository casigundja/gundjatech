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
        } elseif (in_array($statusFilter, ['waiting_staff', 'waiting_client', 'closed'], true)) {
            $query->where('status', $statusFilter);
        }

        $conversations = $query->get();

        $activeConversation = null;
        if ($request->filled('conversation_id')) {
            $activeConversation = Conversation::with(['messages.sender', 'client', 'assignedStaff'])
                ->find($request->conversation_id);
        } elseif ($conversations->isNotEmpty()) {
            $activeConversation = $conversations->first();
            $activeConversation->load(['messages.sender', 'client', 'assignedStaff']);
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
                'message' => $msg->message,
                'created_at' => $msg->created_at?->format('d/m H:i') ?? '',
            ];
        })->values()->all();

        return response()->json([
            'ok' => true,
            'conversation_id' => $conversation->id,
            'status' => $conversation->status,
            'status_label' => $conversation->status_label,
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
            ]);

            ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'staff',
                'sender_name' => Auth::user()->name,
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
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            $conversation->update([
                'user_id' => Auth::id(),
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
                'message' => [
                    'id' => $createdMessage->id,
                    'sender_type' => 'staff',
                    'sender_name' => Auth::user()->name,
                    'message' => $createdMessage->message,
                    'created_at' => $createdMessage->created_at?->format('d/m H:i') ?? '',
                ],
            ]);
        }

        return redirect()->route('admin.chat.index', ['conversation_id' => $conversation->id])
            ->with('success', 'Mensagem enviada!');
    }

    public function closeConversation(Conversation $conversation): RedirectResponse
    {
        $conversation->update([
            'status' => 'closed',
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
