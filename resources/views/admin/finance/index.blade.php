@extends('layouts.admin')
@section('title', 'Financeiro • GundjaTech')
@section('header_title', 'Fluxo de Caixa & Financeiro')

@section('content')
<div class="space-y-6" x-data="{ transModal: false }">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form method="GET" class="flex flex-wrap gap-2">
            <select name="type" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                <option value="">Todos os tipos</option>
                <option value="income" {{ request('type') === 'income' ? 'selected' : '' }}>Receitas</option>
                <option value="expense" {{ request('type') === 'expense' ? 'selected' : '' }}>Despesas</option>
            </select>
            <select name="status" class="bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                <option value="">Todos os status</option>
                <option value="paid" {{ request('status') === 'paid' ? 'selected' : '' }}>Pago</option>
                <option value="pending" {{ request('status') === 'pending' ? 'selected' : '' }}>Pendente</option>
                <option value="overdue" {{ request('status') === 'overdue' ? 'selected' : '' }}>Vencido</option>
                <option value="cancelled" {{ request('status') === 'cancelled' ? 'selected' : '' }}>Cancelado</option>
            </select>
            <button type="submit" class="btn-secondary px-4 py-2 rounded-xl text-xs font-bold">Filtrar</button>
        </form>

        @if(Auth::user()->hasPermission('finance.manage'))
            <button @click="transModal = true" class="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 self-start md:self-auto">
                <span>+ Novo Lançamento</span>
            </button>
        @endif
    </div>

    <!-- Balance Summary -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div class="glass-card p-5 rounded-2xl border border-[#222222]">
            <span class="text-xs text-gray-400 font-medium">Entradas Confirmadas</span>
            <div class="text-2xl font-extrabold text-emerald-400 mt-2">R$ {{ number_format($totalIncome, 2, ',', '.') }}</div>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-[#222222]">
            <span class="text-xs text-gray-400 font-medium">A Receber (Pendente)</span>
            <div class="text-2xl font-extrabold text-amber-400 mt-2">R$ {{ number_format($pendingIncome, 2, ',', '.') }}</div>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-[#222222]">
            <span class="text-xs text-gray-400 font-medium">Despesas & Custos</span>
            <div class="text-2xl font-extrabold text-red-400 mt-2">R$ {{ number_format($totalExpense, 2, ',', '.') }}</div>
        </div>
        <div class="glass-card p-5 rounded-2xl border border-[#222222]">
            <span class="text-xs text-gray-400 font-medium">Saldo Líquido</span>
            <div class="text-2xl font-extrabold text-[#E4A318] mt-2">R$ {{ number_format($netBalance, 2, ',', '.') }}</div>
        </div>
    </div>

    <!-- Transactions List -->
    <div class="glass-card rounded-2xl border border-[#222222] overflow-hidden">
        <div class="p-4 border-b border-[#222222] flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-white">Extrato de Lançamentos</h3>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
                <thead class="bg-[#141414] text-gray-400 uppercase text-[10px] border-b border-[#222222]">
                    <tr>
                        <th class="px-6 py-4">Vencimento / Pagto</th>
                        <th class="px-6 py-4">Descrição & Categoria</th>
                        <th class="px-6 py-4">Cliente / Origem</th>
                        <th class="px-6 py-4">Tipo</th>
                        <th class="px-6 py-4">Valor</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#222222]">
                    @forelse($transactions as $t)
                        <tr class="hover:bg-[#161616]">
                            <td class="px-6 py-4 text-gray-400">
                                <span class="text-white block">{{ $t->due_date->format('d/m/Y') }}</span>
                                @if($t->paid_date)
                                    <span class="text-[10px] text-emerald-400">Pago: {{ $t->paid_date->format('d/m/Y') }}</span>
                                @endif
                            </td>
                            <td class="px-6 py-4">
                                <span class="font-bold text-white block">{{ $t->title }}</span>
                                <span class="text-[10px] text-gray-400">{{ $t->category }}{{ $t->payment_method ? ' • ' . $t->payment_method : '' }}</span>
                            </td>
                            <td class="px-6 py-4 text-gray-300">
                                {{ $t->client ? $t->client->display_name : 'GundjaTech Interno' }}
                                @if($t->project)
                                    <span class="block text-[10px] text-[#E4A318] font-mono">{{ $t->project->code }}</span>
                                @endif
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold {{ $t->type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400' }}">
                                    {{ $t->type === 'income' ? 'Receita' : 'Despesa' }}
                                </span>
                            </td>
                            <td class="px-6 py-4 font-bold whitespace-nowrap {{ $t->type === 'income' ? 'text-emerald-400' : 'text-red-400' }}">
                                {{ $t->type === 'income' ? '+' : '-' }} R$ {{ number_format($t->amount, 2, ',', '.') }}
                            </td>
                            <td class="px-6 py-4">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded {{ $t->status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : ($t->status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400') }}">
                                    {{ $t->status_label }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-right whitespace-nowrap">
                                @if(Auth::user()->hasPermission('finance.manage'))
                                    <div class="inline-flex items-center gap-2">
                                        @if(in_array($t->status, ['pending', 'overdue'], true))
                                            <form action="{{ route('admin.finance.pay', $t) }}" method="POST">
                                                @csrf
                                                <button type="submit" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25">
                                                    Confirmar Pagto
                                                </button>
                                            </form>
                                        @endif
                                        <form action="{{ route('admin.finance.destroy', $t) }}" method="POST" onsubmit="return confirm('Excluir este lançamento financeiro?');">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="text-red-400 hover:text-red-300 text-xs">Excluir</button>
                                        </form>
                                    </div>
                                @endif
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">Nenhuma transação registrada.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
        @if($transactions->hasPages())
            <div class="p-4 border-t border-[#222222]">{{ $transactions->links() }}</div>
        @endif
    </div>

    <!-- Recent Quotations Link Panel -->
    @if($recentQuotations->isNotEmpty())
        <div class="glass-card p-6 rounded-2xl border border-[#222222] space-y-3">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-white">Orçamentos Recentes</h3>
                @if(Auth::user()->hasPermission('quotations.view'))
                    <a href="{{ route('admin.quotations.index') }}" class="text-xs text-[#E4A318] font-bold hover:underline">Ver todos os orçamentos &rarr;</a>
                @endif
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                @foreach($recentQuotations as $q)
                    <div class="p-3.5 bg-[#141414] rounded-xl border border-[#2E2D2C] flex items-center justify-between text-xs">
                        <div class="truncate pr-2">
                            <div class="font-mono font-bold text-[#E4A318]">{{ $q->quotation_number }}</div>
                            <div class="text-white font-semibold truncate">{{ $q->client?->display_name ?? 'Cliente' }}</div>
                        </div>
                        <div class="text-right shrink-0">
                            <div class="font-bold text-white">R$ {{ number_format($q->total, 2, ',', '.') }}</div>
                            <span class="text-[10px] text-gray-400">{{ $q->status_label }}</span>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>
    @endif

    <!-- Modal Transaction -->
    <div x-show="transModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <div class="glass-card max-w-md w-full p-6 rounded-3xl border border-[#E4A318]/40 space-y-4">
            <h3 class="text-base font-bold text-white">Novo Lançamento Financeiro</h3>
            <form action="{{ route('admin.finance.store') }}" method="POST" class="space-y-4">
                @csrf
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Tipo</label>
                        <select name="type" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                            <option value="income">Receita (Entrada)</option>
                            <option value="expense">Despesa (Saída)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Valor (R$)</label>
                        <input type="number" step="0.01" min="0.01" name="amount" required placeholder="0.00" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Título / Descrição *</label>
                    <input type="text" name="title" required placeholder="Ex: Pagamento 50% Entrada Site" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Categoria</label>
                        <input type="text" name="category" required value="Desenvolvimento" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Data Vencimento</label>
                        <input type="date" name="due_date" value="{{ date('Y-m-d') }}" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Forma de Pagto</label>
                        <select name="payment_method" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                            <option value="PIX">PIX</option>
                            <option value="Boleto Bancário">Boleto Bancário</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Transferência">Transferência Bancária</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 mb-1">Status</label>
                        <select name="status" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                            <option value="paid">Pago / Confirmado</option>
                            <option value="pending">Pendente</option>
                            <option value="overdue">Vencido</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Cliente Vinculado</label>
                    <select name="client_id" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        <option value="">Nenhum (Lançamento Interno)</option>
                        @foreach($clients as $c)
                            <option value="{{ $c->id }}">{{ $c->display_name }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 mb-1">Projeto Vinculado (Opcional)</label>
                    <select name="project_id" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        <option value="">Nenhum</option>
                        @foreach($projects as $proj)
                            <option value="{{ $proj->id }}">[{{ $proj->code }}] {{ $proj->name }}</option>
                        @endforeach
                    </select>
                </div>
                <div class="flex items-center justify-end gap-3 pt-2">
                    <button type="button" @click="transModal = false" class="btn-secondary px-4 py-2 rounded-xl text-xs font-semibold">Cancelar</button>
                    <button type="submit" class="btn-primary px-5 py-2 rounded-xl text-xs font-bold">Registrar</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
