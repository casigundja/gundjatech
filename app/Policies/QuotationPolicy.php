<?php

namespace App\Policies;

use App\Models\Quotation;
use App\Models\User;

class QuotationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('quotations.view') || $user->hasPermission('portal.quotations.approve');
    }

    public function view(User $user, Quotation $quotation): bool
    {
        if ($user->isStaff() && $user->hasPermission('quotations.view')) {
            return true;
        }

        return $user->client !== null && $quotation->client_id === $user->client->id;
    }

    public function create(User $user): bool
    {
        return $user->isStaff() && $user->hasPermission('quotations.manage');
    }

    public function update(User $user, Quotation $quotation): bool
    {
        return $user->isStaff() && $user->hasPermission('quotations.manage');
    }

    public function approve(User $user, Quotation $quotation): bool
    {
        return $user->client !== null
            && $quotation->client_id === $user->client->id
            && $user->hasPermission('portal.quotations.approve');
    }

    public function reject(User $user, Quotation $quotation): bool
    {
        return $this->approve($user, $quotation);
    }
}
