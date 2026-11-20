<?php

namespace App\Policies;

use App\Models\Domain;
use App\Models\User;

class DomainPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('domains.view') || $user->hasPermission('portal.domains.view');
    }

    public function view(User $user, Domain $domain): bool
    {
        if ($user->isStaff() && $user->hasPermission('domains.view')) {
            return true;
        }

        return $user->client !== null && $domain->client_id === $user->client->id;
    }

    public function create(User $user): bool
    {
        return $user->isStaff() && $user->hasPermission('domains.manage');
    }

    public function update(User $user, Domain $domain): bool
    {
        return $user->isStaff() && $user->hasPermission('domains.manage');
    }
}
