@extends('layouts.admin')
@section('title', 'Novo Orçamento • GundjaTech')
@section('header_title', 'Emitir Nova Proposta Comercial')

@section('content')
<div class="max-w-4xl mx-auto glass-card p-8 rounded-3xl border border-[#222222]" x-data="quotationBuilder()">
    <form action="{{ route('admin.quotations.store') }}" method="POST" class="space-y-6">
        @csrf

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Cliente *</label>
                <select name="client_id" required class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                    <option value="">Selecione o cliente...</option>
                    @foreach($clients as $client)
                        <option value="{{ $client->id }}" {{ old('client_id', $selectedClientId) == $client->id ? 'selected' : '' }}>
                            {{ $client->display_name }} ({{ $client->name }})
                        </option>
                    @endforeach
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Solicitação Vinculada (Opcional)</label>
                <select name="service_request_id" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
                    <option value="">Nenhuma solicitação</option>
                    @foreach($serviceRequests as $sr)
                        <option value="{{ $sr->id }}" {{ old('service_request_id', $selectedRequestId) == $sr->id ? 'selected' : '' }}>
                            [{{ $sr->protocol }}] {{ $sr->title }}
                        </option>
                    @endforeach
                </select>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2">
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Título da Proposta *</label>
                <input type="text" name="title" required value="{{ old('title') }}" placeholder="Ex: Desenvolvimento de E-Commerce + Gestão de Tráfego" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Validade *</label>
                <input type="date" name="valid_until" required value="{{ old('valid_until', date('Y-m-d', strtotime('+15 days'))) }}" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#E4A318]">
            </div>
        </div>

        <!-- Dynamic Items Section -->
        <div class="space-y-3 pt-2 border-t border-[#222222]">
            <div class="flex items-center justify-between">
                <h3 class="text-xs font-bold uppercase tracking-wider text-[#E4A318]">Itens da Proposta</h3>
                <button type="button" @click="addItem()" class="btn-secondary px-3 py-1.5 rounded-lg text-xs font-bold">+ Adicionar Item</button>
            </div>

            <template x-for="(item, index) in items" :key="index">
                <div class="p-4 bg-[#141414] rounded-2xl border border-[#2E2D2C] space-y-3">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div class="md:col-span-4">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Serviço do Catálogo</label>
                            <select :name="`items[${index}][service_id]`" x-model="item.service_id" @change="applyService(index)" class="w-full bg-[#0B0B0B] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                                <option value="">Item personalizado</option>
                                @foreach($services as $service)
                                    <option value="{{ $service->id }}">{{ $service->name }} (R$ {{ number_format($service->base_price ?? 0, 2, ',', '.') }})</option>
                                @endforeach
                            </select>
                        </div>
                        <div class="md:col-span-4">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Descrição *</label>
                            <input type="text" :name="`items[${index}][description]`" x-model="item.description" required placeholder="Descrição do entregável" class="w-full bg-[#0B0B0B] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        </div>
                        <div class="md:col-span-1">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd</label>
                            <input type="number" min="1" :name="`items[${index}][quantity]`" x-model.number="item.quantity" required class="w-full bg-[#0B0B0B] border border-[#2E2D2C] rounded-xl px-2.5 py-2 text-xs text-white text-center">
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Unitário (R$)</label>
                            <input type="number" step="0.01" min="0" :name="`items[${index}][unit_price]`" x-model.number="item.unit_price" required class="w-full bg-[#0B0B0B] border border-[#2E2D2C] rounded-xl px-3 py-2 text-xs text-white">
                        </div>
                        <div class="md:col-span-1 flex justify-end">
                            <button type="button" @click="removeItem(index)" x-show="items.length > 1" class="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold" title="Remover item">&times;</button>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <!-- Totals & Conditions -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#222222]">
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Status Inicial</label>
                    <select name="status" class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2.5 text-xs text-white">
                        <option value="sent" selected>Enviar ao Cliente (Disponível no Portal)</option>
                        <option value="draft">Salvar como Rascunho Interno</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-300 uppercase mb-1">Condições Comerciais & Observações</label>
                    <textarea name="notes" rows="3" placeholder="Ex: 50% na assinatura e 50% na entrega final..." class="w-full bg-[#141414] border border-[#2E2D2C] rounded-xl px-4 py-2 text-xs text-white">{{ old('notes') }}</textarea>
                </div>
            </div>

            <div class="p-5 bg-[#141414] rounded-2xl border border-[#2E2D2C] space-y-3 self-start">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">Subtotal</span>
                    <span class="font-bold text-white" x-text="formatMoney(subtotal())"></span>
                </div>
                <div class="flex items-center justify-between text-xs gap-4">
                    <label class="text-gray-400">Desconto (R$)</label>
                    <input type="number" step="0.01" min="0" name="discount" x-model.number="discount" class="w-32 bg-[#0B0B0B] border border-[#2E2D2C] rounded-lg px-3 py-1.5 text-xs text-white text-right">
                </div>
                <div class="pt-3 border-t border-[#222222] flex items-center justify-between">
                    <span class="text-xs font-bold uppercase text-gray-300">Valor Final</span>
                    <span class="text-xl font-extrabold text-[#E4A318]" x-text="formatMoney(total())"></span>
                </div>
            </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-4">
            <a href="{{ route('admin.quotations.index') }}" class="btn-secondary px-5 py-2.5 rounded-xl text-xs font-semibold">Cancelar</a>
            <button type="submit" class="btn-primary px-6 py-2.5 rounded-xl text-xs font-bold">Emitir Orçamento</button>
        </div>
    </form>
</div>
@endsection

@push('scripts')
<script>
function quotationBuilder() {
    const catalog = @json($services->mapWithKeys(fn ($s) => [$s->id => ['name' => $s->name, 'price' => (float) ($s->base_price ?? 0)]]));

    return {
        discount: 0,
        items: [
            { service_id: '', description: '', quantity: 1, unit_price: 0 }
        ],
        addItem() {
            this.items.push({ service_id: '', description: '', quantity: 1, unit_price: 0 });
        },
        removeItem(index) {
            if (this.items.length > 1) {
                this.items.splice(index, 1);
            }
        },
        applyService(index) {
            const id = this.items[index].service_id;
            if (id && catalog[id]) {
                this.items[index].description = catalog[id].name;
                this.items[index].unit_price = catalog[id].price;
            }
        },
        subtotal() {
            return this.items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)), 0);
        },
        total() {
            return Math.max(0, this.subtotal() - (Number(this.discount) || 0));
        },
        formatMoney(val) {
            return 'R$ ' + Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    };
}
</script>
@endpush
