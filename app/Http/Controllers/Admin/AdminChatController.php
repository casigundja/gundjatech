<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Conversation;
use App\Models\ConversationMessage;
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
            ->orderBy('updated_at', 'desc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
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

        if ($activeConversation) {
            $activeConversation->messages()
                ->where('sender_type', 'client')
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }

        $clients = Client::where('status', 'active')->orderBy('company_name')->get();

        return view('admin.chat.index', compact('conversations', 'activeConversation', 'clients'));
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
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            return $conversation;
        });

        return redirect()->route('admin.chat.index', ['conversation_id' => $conversation->id])
            ->with('success', 'Novo atendimento iniciado com o cliente!');
    }

    public function sendMessage(Request $request, Conversation $conversation): RedirectResponse
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);

        DB::transaction(function () use ($conversation, $validated): void {
            ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'staff',
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            $conversation->update([
                'user_id' => Auth::id(),
                'status' => 'waiting_client',
                'closed_at' => null,
            ]);
            $conversation->touch();
        });

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
