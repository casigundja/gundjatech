@extends('layouts.admin')
@section('title', 'CRM Autônomo IA • GundjaTech')
@section('header_title', 'CRM Autônomo & Qualificação IA')

@section('content')
@php
    $modeLabel = match ($config['effective_mode']) {
        'gemini' => (! empty($config['is_vertex_express']) ? 'Google Gemini · Vertex AI Express (' : 'Google Gemini (') . $config['model'] . ')',
        'openai' => 'OpenAI (' . $config['model'] . ')',
        default => 'Motor Comercial Local (sem API externa)',
    };
@endphp

<!-- Sub-Header -->
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
    <p class="text-xs sm:text-sm text-[#8C95AA]">
        Motor ativo: <strong class="text-[#F2C230]">{{ $modeLabel }}</strong>
        <span class="text-[#5D667B]">•</span>
        Status global:
        <span class="font-bold {{ $config['enabled'] ? 'text-[#6EE7B7]' : 'text-red-400' }}">
            {{ $config['enabled'] ? 'Piloto Automático Ligado' : 'Pausado (Somente Humano)' }}
        </span>
    </p>
    <div class="flex items-center gap-2">
        <a href="{{ route('admin.chat.index') }}" class="gtb-ctrl-btn">
            <span>Abrir Central de Chat</span>
            <svg class="w-3.5 h-3.5 text-[#F2C230]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </a>
    </div>
</div>

<!-- ROW 1: 4 AUTONOMOUS CRM KPI CARDS -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="gtb-card gtb-kpi-gold flex flex-col justify-between gap-3">
        <span class="text-xs font-semibold text-[#D5DCEB]">Em Piloto Automático</span>
        <div class="flex items-baseline justify-between">
            <span class="gt-font-display text-2xl font-extrabold text-white">{{ $activeAutopilotCount }}</span>
            <span class="px-2 py-0.5 rounded-full bg-[#F2C230]/15 text-[#F2C230] text-[10px] font-bold">IA Ativa</span>
        </div>
    </div>

    <div class="gtb-card gtb-kpi-blue flex flex-col justify-between gap-3">
        <span class="text-xs font-semibold text-[#D5DCEB]">Em Qualificação</span>
        <div class="flex items-baseline justify-between">
            <span class="gt-font-display text-2xl font-extrabold text-white">{{ $qualifyingCount }}</span>
            <span class="px-2 py-0.5 rounded-full bg-[#121AFF]/20 text-[#93A3FF] text-[10px] font-bold">Coletando Escopo</span>
        </div>
    </div>

    <div class="gtb-card gtb-kpi-petrol flex flex-col justify-between gap-3">
        <span class="text-xs font-semibold text-[#D5DCEB]">Pré-Orçamentos IA</span>
        <div class="flex items-baseline justify-between">
            <span class="gt-font-display text-2xl font-extrabold text-white">{{ $aiQuotationsCount }}</span>
            <span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-[#6EE7B7] text-[10px] font-bold">{{ $proposalReadyCount }} prontos</span>
        </div>
    </div>

    <div class="gtb-card flex flex-col justify-between gap-3">
        <span class="text-xs font-semibold text-[#D5DCEB]">Transferidos p/ Humano</span>
        <div class="flex items-baseline justify-between">
            <span class="gt-font-display text-2xl font-extrabold text-white">{{ $handoffCount }}</span>
            <span class="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold">Handoff</span>
        </div>
    </div>
</div>

<!-- ROW 2: PIPELINE TABLE (8 cols) + AI CONFIGURATION PANEL (4 cols) -->
<div class="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
    <!-- Autonomous CRM Pipeline -->
    <section class="xl:col-span-8 gtb-card space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
                <h2 class="text-sm sm:text-base font-bold text-white">Pipeline de Qualificação Autônoma</h2>
                <p class="text-[11px] text-[#8C95AA]">O agente conversa com cada visitante, extrai escopo/prazo/orçamento, atualiza o CRM e gera rascunhos de orçamento.</p>
            </div>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead>
                    <tr class="border-b border-white/10 text-[10.5px] uppercase tracking-wider">
                        <th class="py-2.5 px-3">Visitante / Lead</th>
                        <th class="py-2.5 px-3">Score</th>
                        <th class="py-2.5 px-3">Estágio &amp; Resumo IA</th>
                        <th class="py-2.5 px-3">Modo</th>
                        <th class="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                    @forelse($conversations as $conv)
                        @php
                            $leadName = $conv->visitor_name ?: ($conv->client?->display_name ?? 'Visitante');
                            $extracted = is_array($conv->extracted_data) ? $conv->extracted_data : [];
                            $draftQuotationId = $extracted['draft_quotation_id'] ?? $conv->serviceRequest?->quotation?->id;
                            $score = (int) $conv->lead_score;
                        @endphp
                        <tr class="hover:bg-white/[0.02]">
                            <td class="py-3 px-3 align-top">
                                <div class="font-bold text-white">{{ $leadName }}</div>
                                <div class="text-[10.5px] text-[#8C95AA]">{{ $conv->visitor_email ?: $conv->client?->email }}</div>
                                @if(! empty($extracted['company']))
                                    <div class="text-[10px] text-[#F2C230] font-semibold mt-0.5">{{ $extracted['company'] }}</div>
                                @endif
                            </td>
                            <td class="py-3 px-3 align-top whitespace-nowrap">
                                <div class="font-extrabold text-white">{{ $score }}/100</div>
                                <div class="w-16 h-1.5 rounded-full bg-[#222738] overflow-hidden mt-1">
                                    <div class="h-full rounded-full" style="width: {{ $score }}%; background: linear-gradient(90deg, #F2C230 0%, #34D399 100%);"></div>
                                </div>
                            </td>
                            <td class="py-3 px-3 align-top max-w-xs">
                                <span class="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 {{ $conv->crm_stage === 'proposal_ready' ? 'bg-emerald-500/15 text-[#6EE7B7]' : ($conv->crm_stage === 'handoff_human' ? 'bg-amber-500/20 text-amber-300' : 'bg-[#121AFF]/20 text-[#93A3FF]') }}">
                                    {{ $conv->crm_stage_label }}
                                </span>
                                <p class="text-[11px] text-[#D5DCEB] leading-snug">
                                    {{ $conv->ai_summary ?: ($conv->latestMessage?->message ?? $conv->subject) }}
                                </p>
                                @if($conv->ai_handoff_reason)
                                    <div class="text-[10px] text-amber-300 mt-1 font-semibold">Motivo Handoff: {{ $conv->ai_handoff_reason }}</div>
                                @endif
                                <div class="flex flex-wrap gap-2 mt-1.5">
                                    @if($conv->service_request_id)
                                        <a href="{{ route('admin.requests.show', $conv->service_request_id) }}" class="text-[10px] font-bold text-[#F2C230] hover:underline">Solicitação &rarr;</a>
                                    @endif
                                    @if($draftQuotationId)
                                        <a href="{{ route('admin.quotations.show', $draftQuotationId) }}" class="text-[10px] font-bold text-[#6EE7B7] hover:underline">Pré-Orçamento IA &rarr;</a>
                                    @endif
                                </div>
                            </td>
                            <td class="py-3 px-3 align-top whitespace-nowrap">
                                @if($conv->ai_enabled && $conv->status !== 'closed')
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F2C230]/15 border border-[#F2C230]/35 text-[#F2C230] text-[10px] font-bold">
                                        Piloto IA
                                    </span>
                                @else
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#D5DCEB] text-[10px] font-bold">
                                        Humano
                                    </span>
                                @endif
                            </td>
                            <td class="py-3 px-3 align-top text-right whitespace-nowrap space-y-1.5">
                                <div>
                                    <a href="{{ route('admin.chat.index', ['conversation_id' => $conv->id]) }}" class="btn-primary inline-flex px-3 py-1.5 text-[11px] no-underline">
                                        Abrir Chat
                                    </a>
                                </div>
                                @if(Auth::user()->hasPermission('chat.manage') && $conv->status !== 'closed')
                                    <form action="{{ route('admin.chat.toggle-ai', $conv) }}" method="POST">
                                        @csrf
                                        <button type="submit" class="btn-secondary px-2.5 py-1 text-[10px] cursor-pointer">
                                            {{ $conv->ai_enabled ? 'Assumir (Pausar IA)' : 'Reativar IA' }}
                                        </button>
                                    </form>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="py-10 text-center text-xs text-[#8C95AA]">
                                Nenhum atendimento no CRM Autônomo ainda. Assim que um visitante iniciar o chat no site, a IA assume a qualificação automaticamente aqui.
                            </td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </section>

    <!-- AI Settings Panel -->
    <section class="xl:col-span-4 gtb-card space-y-4">
        <div>
            <h2 class="text-sm sm:text-base font-bold text-white">Configurações do Agente IA</h2>
            <p class="text-[11px] text-[#8C95AA]">Funciona imediatamente com o motor comercial local e se potencializa automaticamente ao informar sua chave Gemini (AI Studio ou Vertex AI Express) ou OpenAI.</p>
        </div>

        @if(session('crm_test_result'))
            @php($testResult = session('crm_test_result'))
            <div class="p-3.5 rounded-xl border text-xs space-y-2 {{ ! empty($testResult['ok']) ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-400/50 text-emerald-900 dark:text-[#6EE7B7]' : 'bg-amber-50 dark:bg-amber-500/10 border-[#F2C230]/70 text-[#063B5C] dark:text-amber-200' }}">
                <div class="font-bold flex items-center justify-between gap-2">
                    <span>{{ ! empty($testResult['ok']) ? 'Conexão IA Verificada' : 'Ação Necessária na API Externa' }}</span>
                    @if(! empty($testResult['latency_ms']))
                        <span class="text-[10px] font-mono opacity-80">{{ $testResult['latency_ms'] }}ms</span>
                    @endif
                </div>
                <p class="text-[11px] leading-relaxed text-[#063B5C] dark:text-[#E7F0F5]">{{ $testResult['message'] ?? '' }}</p>
                @if(! empty($testResult['action_url']))
                    <a href="{{ $testResult['action_url'] }}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F2C230] text-[#063B5C] font-extrabold text-[11px] no-underline hover:bg-[#E0B020]">
                        <span>{{ $testResult['action_label'] ?? 'Abrir Google Cloud Console' }}</span>
                        <span>&rarr;</span>
                    </a>
                @endif
            </div>
        @endif

        @if(Auth::user()->hasPermission('settings.manage'))
            <form action="{{ route('admin.crm.settings') }}" method="POST" class="space-y-3.5 text-xs">
                @csrf
                @method('PUT')

                <label class="gtb-surface-box flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer">
                    <div>
                        <div class="font-bold text-white">Piloto Automático Ativo</div>
                        <div class="text-[10.5px] text-[#8C95AA]">Responder novos visitantes automaticamente no chat</div>
                    </div>
                    <input type="checkbox" name="crm_ai_enabled" value="1" @checked($config['enabled']) class="w-4 h-4 accent-[#F2C230]">
                </label>

                <label class="gtb-surface-box flex items-center justify-between gap-3 p-3 rounded-xl cursor-pointer">
                    <div>
                        <div class="font-bold text-white">Auto-gerar Pré-Orçamento</div>
                        <div class="text-[10.5px] text-[#8C95AA]">Criar rascunho em /admin/orcamentos ao qualificar</div>
                    </div>
                    <input type="checkbox" name="crm_ai_auto_draft_quotation" value="1" @checked($config['auto_draft_quotation']) class="w-4 h-4 accent-[#F2C230]">
                </label>

                <div>
                    <label class="block text-[11px] font-bold text-[#8C95AA] uppercase mb-1">Nome do Assistente no Chat</label>
                    <input type="text" name="crm_ai_agent_name" value="{{ old('crm_ai_agent_name', $config['agent_name']) }}" required class="w-full px-3 py-2 text-xs">
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-[#8C95AA] uppercase mb-1">Motor / Provedor de IA</label>
                    <select name="crm_ai_provider" class="w-full px-3 py-2 text-xs">
                        <option value="auto" @selected($config['provider'] === 'auto')>Automático (Gemini/OpenAI se houver chave + Fallback Local)</option>
                        <option value="gemini" @selected($config['provider'] === 'gemini')>Google Gemini API</option>
                        <option value="openai" @selected($config['provider'] === 'openai')>OpenAI API</option>
                        <option value="rules" @selected($config['provider'] === 'rules')>Somente Motor Comercial Local (sem API externa)</option>
                    </select>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-[#8C95AA] uppercase mb-1">Modelo LLM (opcional)</label>
                    <input type="text" name="crm_ai_model" value="{{ old('crm_ai_model', $config['model']) }}" placeholder="gemini-2.5-flash ou gpt-4o-mini" class="w-full px-3 py-2 text-xs font-mono">
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-[#8C95AA] uppercase mb-1">
                        Chave de API (Gemini ou OpenAI)
                        @if($config['has_api_key'])
                            <span class="text-[#6EE7B7] normal-case font-semibold">• Configurada ({{ $config['api_key_prefix'] }}) ✓</span>
                        @endif
                    </label>
                    <input type="password" name="crm_ai_api_key" autocomplete="new-password" placeholder="{{ $config['has_api_key'] ? 'Deixe em branco para manter a chave atual' : 'AIza... (AI Studio), AQ... (Vertex Express) ou sk-... (OpenAI)' }}" class="w-full px-3 py-2 text-xs font-mono">
                    @if($config['has_api_key'])
                        <label class="inline-flex items-center gap-2 mt-1.5 text-[10.5px] text-red-400 cursor-pointer">
                            <input type="checkbox" name="clear_api_key" value="1" class="accent-red-500">
                            Remover chave armazenada no banco
                        </label>
                    @endif
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-[#8C95AA] uppercase mb-1">Diretrizes Comerciais &amp; Tom de Voz</label>
                    <textarea name="crm_ai_system_prompt" rows="5" required class="w-full px-3 py-2 text-xs leading-relaxed">{{ old('crm_ai_system_prompt', $config['system_prompt']) }}</textarea>
                </div>

                <button type="submit" class="btn-primary w-full py-2.5 text-xs cursor-pointer">
                    Salvar Configurações do CRM Autônomo
                </button>
            </form>

            <form action="{{ route('admin.crm.test') }}" method="POST" class="pt-1">
                @csrf
                <button type="submit" class="btn-secondary w-full py-2 text-xs cursor-pointer">
                    Testar Conexão com a IA Agora
                </button>
            </form>
        @else
            <div class="p-4 rounded-xl bg-[#171B27] border border-white/10 text-xs text-[#8C95AA]">
                Apenas administradores com permissão <code>settings.manage</code> podem alterar as credenciais e diretrizes da IA.
            </div>
        @endif
    </section>
</div>
@endsection
