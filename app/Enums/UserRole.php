<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'superadmin';
    case Admin = 'admin';
    case Manager = 'manager';
    case Attendant = 'attendant';
    case Developer = 'developer';
    case Financial = 'financial';
    case Client = 'client';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Administrador',
            self::Admin => 'Administrador',
            self::Manager => 'Gerente de Projetos',
            self::Attendant => 'Atendimento',
            self::Developer => 'Desenvolvedor',
            self::Financial => 'Financeiro',
            self::Client => 'Cliente',
        };
    }

    public function isStaff(): bool
    {
        return $this !== self::Client;
    }

    /**
     * @return list<string>
     */
    public function defaultPermissions(): array
    {
        return match ($this) {
            self::SuperAdmin => ['*'],
            self::Admin => [
                'admin.dashboard.view',
                'clients.view', 'clients.manage',
                'requests.view', 'requests.manage',
                'quotations.view', 'quotations.manage',
                'projects.view', 'projects.manage',
                'services.view', 'services.manage',
                'domains.view', 'domains.manage',
                'campaigns.view', 'campaigns.manage',
                'finance.view', 'finance.manage',
                'chat.view', 'chat.manage',
                'users.view', 'users.manage',
                'settings.manage',
            ],
            self::Manager => [
                'admin.dashboard.view',
                'clients.view', 'clients.manage',
                'requests.view', 'requests.manage',
                'quotations.view', 'quotations.manage',
                'projects.view', 'projects.manage',
                'services.view',
                'domains.view', 'domains.manage',
                'campaigns.view', 'campaigns.manage',
                'chat.view', 'chat.manage',
            ],
            self::Attendant => [
                'admin.dashboard.view',
                'clients.view',
                'requests.view', 'requests.manage',
                'quotations.view',
                'chat.view', 'chat.manage',
            ],
            self::Developer => [
                'admin.dashboard.view',
                'projects.view', 'projects.manage',
                'domains.view', 'domains.manage',
                'services.view',
            ],
            self::Financial => [
                'admin.dashboard.view',
                'clients.view',
                'quotations.view', 'quotations.manage',
                'finance.view', 'finance.manage',
                'domains.view',
            ],
            self::Client => [
                'portal.access',
                'portal.requests.manage',
                'portal.projects.view',
                'portal.quotations.approve',
                'portal.domains.view',
                'portal.campaigns.view',
                'portal.finance.view',
                'portal.chat.manage',
            ],
        };
    }
}
