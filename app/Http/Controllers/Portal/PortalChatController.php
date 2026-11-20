<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\View\View;

class PortalChatController extends Controller
{
    public function index(): View
    {
        $user = Auth::user();
        $client = $user->ensureClientProfile();

        if (! $client) {
            if ($user->isAdmin()) {
                return view('portal.chat.index', ['conversation' => null]);
            }

            abort(403, 'Perfil de cliente não localizado.');
        }

        $conversation = Conversation::where('client_id', $client->id)
            ->whereIn('status', ['open', 'waiting_client', 'waiting_staff'])
            ->latest('updated_at')
            ->first();

        if (! $conversation) {
            $conversation = Conversation::create([
                'client_id' => $client->id,
                'subject' => 'Atendimento Geral '.$client->display_name,
                'channel' => 'web_chat',
                'status' => 'open',
            ]);
        }

        $conversation->load(['messages.sender', 'assignedStaff']);

        $conversation->messages()
            ->where('sender_type', 'staff')
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return view('portal.chat.index', compact('conversation'));
    }

    public function sendMessage(Request $request, Conversation $conversation): RedirectResponse
    {
        Gate::authorize('reply', $conversation);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);

        DB::transaction(function () use ($conversation, $validated): void {
            ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'client',
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            $conversation->update([
                'status' => 'waiting_staff',
                'closed_at' => null,
            ]);
            $conversation->touch();
        });

        return back()->with('success', 'Mensagem enviada com sucesso!');
    }
}
