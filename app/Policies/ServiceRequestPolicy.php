<?php

namespace App\Policies;

use App\Models\ServiceRequest;
use App\Models\User;

class ServiceRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('requests.view') || $user->hasPermission('portal.requests.manage');
    }

    public function view(User $user, ServiceRequest $serviceRequest): bool
    {
        if ($user->isStaff() && $user->hasPermission('requests.view')) {
            return true;
        }

        return ($user->client !== null && $serviceRequest->client_id === $user->client->id)
            || $serviceRequest->user_id === $user->id;
    }

    public function update(User $user, ServiceRequest $serviceRequest): bool
    {
        return $user->isStaff() && $user->hasPermission('requests.manage');
    }

    public function delete(User $user, ServiceRequest $serviceRequest): bool
    {
        return $user->isAdmin();
    }
}
