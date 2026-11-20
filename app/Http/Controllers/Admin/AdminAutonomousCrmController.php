<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Conversation;
use App\Models\Quotation;
use App\Models\SystemSetting;
use App\Services\AutonomousCrmAgent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Crypt;
use Illuminate\View\View;

class AdminAutonomousCrmController extends Controller
{
    public function index(AutonomousCrmAgent $crmAgent): View
    {
        $config = $crmAgent->getConfig();

        $conversations = Conversation::with(['client', 'serviceRequest.quotation', 'latestMessage'])
            ->orderByDesc('updated_at')
            ->take(40)
            ->get();

        $activeAutopilotCount = $conversations->where('ai_enabled', true)->where('status', '!=', 'closed')->count();
        $qualifyingCount = $conversations->where('crm_stage', 'qualifying')->count();
        $proposalReadyCount = $conversations->where('crm_stage', 'proposal_ready')->count();
        $handoffCount = $conversations->where('crm_stage', 'handoff_human')->count();
        $aiQuotationsCount = Quotation::where('quotation_number', 'like', 'ORC-AI-%')->count();

        return view('admin.crm.index', compact(
            'config',
            'conversations',
            'activeAutopilotCount',
            'qualifyingCount',
            'proposalReadyCount',
            'handoffCount',
            'aiQuotationsCount'
        ));
    }

    public function updateSettings(Request $request, AutonomousCrmAgent $crmAgent): RedirectResponse
    {
        $validated = $request->validate([
            'crm_ai_enabled' => ['nullable', 'boolean'],
            'crm_ai_auto_draft_quotation' => ['nullable', 'boolean'],
            'crm_ai_provider' => ['required', 'in:auto,gemini,openai,rules'],
            'crm_ai_model' => ['nullable', 'string', 'max:80'],
            'crm_ai_agent_name' => ['required', 'string', 'max:80'],
            'crm_ai_system_prompt' => ['required', 'string', 'max:4000'],
            'crm_ai_api_key' => ['nullable', 'string', 'max:255'],
            'clear_api_key' => ['nullable', 'boolean'],
        ]);

        $now = now();
        $rows = [
            ['key' => 'crm_ai_enabled', 'value' => $request->boolean('crm_ai_enabled') ? '1' : '0', 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'crm_ai_auto_draft_quotation', 'value' => $request->boolean('crm_ai_auto_draft_quotation') ? '1' : '0', 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'crm_ai_provider', 'value' => $validated['crm_ai_provider'], 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'crm_ai_model', 'value' => trim((string) ($validated['crm_ai_model'] ?? '')), 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'crm_ai_agent_name', 'value' => trim($validated['crm_ai_agent_name']), 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'crm_ai_system_prompt', 'value' => trim($validated['crm_ai_system_prompt']), 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now],
        ];

        $newApiKey = trim((string) ($validated['crm_ai_api_key'] ?? ''));
        if ($newApiKey !== '') {
            $rows[] = ['key' => 'crm_ai_api_key', 'value' => Crypt::encryptString($newApiKey), 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now];
        } elseif ($request->boolean('clear_api_key')) {
            $rows[] = ['key' => 'crm_ai_api_key', 'value' => '', 'group' => 'crm_ai', 'created_at' => $now, 'updated_at' => $now];
        }

        SystemSetting::upsert($rows, ['key'], ['value', 'group', 'updated_at']);
        AutonomousCrmAgent::flushCache();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'crm.ai.settings_updated',
            'details' => [
                'enabled' => $request->boolean('crm_ai_enabled'),
                'provider' => $validated['crm_ai_provider'],
                'model' => trim((string) ($validated['crm_ai_model'] ?? '')),
                'auto_draft_quotation' => $request->boolean('crm_ai_auto_draft_quotation'),
                'api_key_updated' => $newApiKey !== '' || $request->boolean('clear_api_key'),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $redirect = redirect()->route('admin.crm.index')
            ->with('success', 'Configurações do CRM Autônomo atualizadas com sucesso!');

        if (! app()->runningUnitTests() && $newApiKey !== '') {
            $redirect->with('crm_test_result', $crmAgent->testConnection());
        }

        return $redirect;
    }

    public function testConnection(AutonomousCrmAgent $crmAgent): RedirectResponse
    {
        $result = $crmAgent->testConnection();

        return redirect()->route('admin.crm.index')
            ->with('crm_test_result', $result);
    }
}
