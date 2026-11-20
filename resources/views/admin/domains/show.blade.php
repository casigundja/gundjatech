@extends('layouts.admin')
@section('title', $domain->domain_name . ' • GundjaTech')
@section('header_title', 'Domínio: ' . $domain->domain_name)

@section('content')
<div class="space-y-6" x-data="{ dnsModal: false, renewModal: false }">
    <div class="glass-card p-6 rounded-3xl border border-[#222222] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <div class="flex items-center gap-3">
                <h2 class="text-2xl font-mono font-extrabold text-white">{{ $domain->domain_name }}</h2>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {{ $domain->status_label }}
                </span>
            </div>
            <p class="text-xs text-gray-400 mt-1">
                Cliente: {{ $domain->client?->display_name ?? 'N/A' }}
                • Registrador: {{ $domain->registrar }}
                • Expira em: {{ $domain->expiration_date ? $domain->expiration_date->format('d/m/Y') : 'N/D' }}
            </p>
        </div>
        @if(Auth::user()->hasPermission('domains.manage'))
            <div class="flex items-center gap-3">
                <button @click="dnsModal = true" class="btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold">
                    + Novo Registro DNS
                </button>
                <button @click="renewModal = true" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold">
                    Renovar Domínio
                </button>
            </div>
        @endif
    </div>

    <!-- DNS Zone Records Table -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Zona de Apontamentos DNS</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-4 py-3">Tipo</th>
                        <th class="px-4 py-3">Nome / Host</th>
                        <th class="px-4 py-3">Conteúdo / Destino</th>
                        <th class="px-4 py-3">TTL</th>
                        <th class="px-4 py-3 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222] font-mono">
                    @forelse($domain->dnsRecords as $dns)
                        <tr class="hover:bg-[#161616]">
                            <td class="px-4 py-3 font-bold text-[#E4A318]">{{ $dns->type }}</td>
                            <td class="px-4 py-3 text-white">{{ $dns->host }}</td>
                            <td class="px-4 py-3 text-gray-300 truncate max-w-xs">{{ $dns->value }}</td>
                            <td class="px-4 py-3 text-gray-400">{{ $dns->ttl }}s</td>
                            <td class="px-4 py-3 text-right font-sans">
                                @if(Auth::user()->hasPermission('domains.manage'))
                                    <form
                                        action="{{ route('admin.domains.dns.destroy', $dns) }}"
                                        method="POST"
                                        data-confirm-title="Remover registro DNS"
                                        data-confirm-message="Tem certeza que deseja remover este apontamento DNS do domínio? Essa alteração pode afetar o acesso imediato ao serviço associado."
                                        data-confirm-target="{{ $dns->type }} • {{ $dns->host }}"
                                        data-confirm-button="Sim, remover DNS"
                                        data-confirm-tone="danger"
                                    >
                                        @csrf
                                        @method('DELETE')
                                        <button type="submit" class="text-red-400 hover:text-red-300 text-xs font-semibold cursor-pointer">Remover</button>
                                    </form>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="5" class="px-4 py-6 text-center text-gray-500 font-sans">Nenhum registro DNS cadastrado.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Renewal History -->
    <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-4">
        <h3 class="text-sm font-bold text-white uppercase tracking-wider">Histórico de Renovações</h3>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-4 py-3">Data Renovação</th>
                        <th class="px-4 py-3">Nova Expiração</th>
                        <th class="px-4 py-3">Fatura</th>
                        <th class="px-4 py-3 text-right">Valor</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($domain->renewals as $ren)
                        <tr class="hover:bg-[#161616]">
                            <td class="px-4 py-3 text-gray-300">{{ $ren->renewal_date->format('d/m/Y') }}</td>
                            <td class="px-4 py-3 text-emerald-400 font-bold">{{ $ren->next_expiration_date->format('d/m/Y') }}</td>
                            <td class="px-4 py-3 font-mono text-gray-400">{{ $ren->invoice_number ?? '-' }}</td>
                            <td class="px-4 py-3 text-right font-bold text-white">R$ {{ number_format($ren->amount, 2, ',', '.') }}</td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="px-4 py-6 text-center text-gray-500">Nenhuma renovação registrada ainda.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    <!-- Modal Add DNS -->
    <div x-show="dnsModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Adicionar Registro DNS</h3>
            <form action="{{ route('admin.domains.dns', $domain) }}" method="POST" class="space-y-4">
                @csrf
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Tipo</label>
                        <select name="type" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                            <option value="A">A (IPv4)</option>
                            <option value="AAAA">AAAA (IPv6)</option>
                            <option value="CNAME">CNAME (Alias)</option>
                            <option value="MX">MX (E-mail)</option>
                            <option value="TXT">TXT (Verificação/SPF)</option>
                            <option value="NS">NS (Nameserver)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Host (@, www, mail)</label>
                        <input type="text" name="host" required placeholder="@" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white font-mono">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Conteúdo / Valor</label>
                    <input type="text" name="value" required placeholder="Ex: 172.67.142.98" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white font-mono">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">TTL (segundos)</label>
                        <input type="number" name="ttl" value="3600" min="60" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Prioridade (MX)</label>
                        <input type="number" name="priority" min="0" placeholder="Opcional" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="dnsModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Salvar Apontamento</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Modal Renew -->
    <div x-show="renewModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Registrar Renovação</h3>
            <form action="{{ route('admin.domains.renew', $domain) }}" method="POST" class="space-y-4">
                @csrf
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Período de Renovação</label>
                    <select name="years" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        <option value="1">1 Ano (+12 meses)</option>
                        <option value="2">2 Anos (+24 meses)</option>
                        <option value="3">3 Anos (+36 meses)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Valor Cobrado (R$)</label>
                    <input type="number" step="0.01" min="0" name="amount" value="{{ $domain->renewal_price ?? 89.90 }}" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                </div>
                <label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input type="checkbox" name="register_finance" value="1" checked class="rounded bg-[#0B0B0B] border-[#2E2D2C] text-[#E4A318]">
                    <span>Lançar receita automaticamente no Financeiro</span>
                </label>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="renewModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Confirmar Renovação</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
