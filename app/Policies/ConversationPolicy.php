<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('chat.view') || $user->hasPermission('portal.chat.manage');
    }

    public function view(User $user, Conversation $conversation): bool
    {
        if ($user->isStaff() && $user->hasPermission('chat.view')) {
            return true;
        }

        return $user->client !== null && $conversation->client_id === $user->client->id;
    }

    public function reply(User $user, Conversation $conversation): bool
    {
        if ($user->isStaff() && $user->hasPermission('chat.manage')) {
            return true;
        }

        return $user->client !== null && $conversation->client_id === $user->client->id;
    }
}
