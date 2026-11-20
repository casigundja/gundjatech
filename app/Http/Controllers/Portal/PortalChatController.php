<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\ConversationMessage;
use Illuminate\Http\JsonResponse;
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

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        Gate::authorize('reply', $conversation);

        $afterId = (int) $request->query('after_id', 0);

        $conversation->messages()
            ->where('sender_type', 'staff')
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
            $isMe = $msg->sender_type === 'client';

            return [
                'id' => $msg->id,
                'sender_type' => $msg->sender_type,
                'sender_name' => $msg->sender?->name ?? $msg->sender_name ?? ($isMe ? 'Você' : 'Equipe GundjaTech'),
                'message' => $msg->message,
                'created_at' => $msg->created_at?->format('d/m H:i') ?? '',
            ];
        })->values()->all();

        return response()->json([
            'ok' => true,
            'status' => $conversation->status,
            'status_label' => $conversation->status_label,
            'messages' => $messages,
        ]);
    }

    public function sendMessage(Request $request, Conversation $conversation): RedirectResponse|JsonResponse
    {
        Gate::authorize('reply', $conversation);

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:3000'],
        ]);

        /** @var ConversationMessage $createdMessage */
        $createdMessage = DB::transaction(function () use ($conversation, $validated): ConversationMessage {
            $createdMessage = ConversationMessage::create([
                'conversation_id' => $conversation->id,
                'sender_id' => Auth::id(),
                'sender_type' => 'client',
                'sender_name' => Auth::user()->name,
                'message' => $validated['message'],
                'is_read' => false,
            ]);

            $conversation->update([
                'status' => 'waiting_staff',
                'closed_at' => null,
            ]);
            $conversation->touch();

            return $createdMessage;
        });

        if ($request->expectsJson()) {
            return response()->json([
                'ok' => true,
                'message' => [
                    'id' => $createdMessage->id,
                    'sender_type' => 'client',
                    'sender_name' => Auth::user()->name,
                    'message' => $createdMessage->message,
                    'created_at' => $createdMessage->created_at?->format('d/m H:i') ?? '',
                ],
            ]);
        }

        return back()->with('success', 'Mensagem enviada com sucesso!');
    }
}
