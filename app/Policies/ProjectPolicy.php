<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('projects.view') || $user->hasPermission('portal.projects.view');
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->isStaff() && $user->hasPermission('projects.view')) {
            return true;
        }

        return $user->client !== null && $project->client_id === $user->client->id;
    }

    public function create(User $user): bool
    {
        return $user->isStaff() && $user->hasPermission('projects.manage');
    }

    public function update(User $user, Project $project): bool
    {
        return $user->isStaff() && $user->hasPermission('projects.manage');
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->isAdmin();
    }
}
