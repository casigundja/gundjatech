<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceRequest;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AdminQuotationController extends Controller
{
    public function index(Request $request): View
    {
        $query = Quotation::with(['client', 'creator', 'serviceRequest', 'project'])
            ->withCount('items');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $like = '%'.mb_strtolower(trim((string) $request->search)).'%';
            $query->where(function ($q) use ($like): void {
                $q->whereRaw('LOWER(quotation_number) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(title) LIKE ?', [$like])
                    ->orWhereHas('client', function ($cq) use ($like): void {
                        $cq->whereRaw('LOWER(company_name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(name) LIKE ?', [$like]);
                    });
            });
        }

        $quotations = $query->orderBy('created_at', 'desc')->paginate(12)->withQueryString();

        $stats = Quotation::query()
            ->selectRaw("
                COUNT(*) AS total_count,
                COALESCE(SUM(total), 0) AS total_value,
                COALESCE(SUM(CASE WHEN status = 'approved' THEN total ELSE 0 END), 0) AS approved_value,
                SUM(CASE WHEN status IN ('draft', 'sent') THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count
            ")
            ->first();

        $totalValue = (float) ($stats->total_value ?? 0);
        $approvedValue = (float) ($stats->approved_value ?? 0);
        $pendingCount = (int) ($stats->pending_count ?? 0);
        $totalCount = (int) ($stats->total_count ?? 0);
        $approvedCount = (int) ($stats->approved_count ?? 0);
        $conversionRate = $totalCount > 0 ? round(($approvedCount / $totalCount) * 100, 1) : 0.0;

        return view('admin.quotations.index', compact(
            'quotations',
            'totalValue',
            'approvedValue',
            'pendingCount',
            'conversionRate'
        ));
    }

    public function create(Request $request): View
    {
        $clients = Client::orderBy('company_name')->get();
        $services = Service::where('is_active', true)->orderBy('name')->get();
        $serviceRequests = ServiceRequest::with('client')
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->orderBy('created_at', 'desc')
            ->get();

        $selectedClientId = $request->integer('client_id') ?: null;
        $selectedRequestId = $request->integer('service_request_id') ?: null;

        return view('admin.quotations.create', compact(
            'clients',
            'services',
            'serviceRequests',
            'selectedClientId',
            'selectedRequestId'
        ));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'service_request_id' => ['nullable', 'exists:service_requests,id'],
            'title' => ['required', 'string', 'max:255'],
            'valid_until' => ['required', 'date', 'after_or_equal:today'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:draft,sent'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.service_id' => ['nullable', 'exists:services,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $quotation = DB::transaction(function () use ($validated): Quotation {
            $subtotal = 0.0;

            foreach ($validated['items'] as $item) {
                $subtotal += ((int) $item['quantity']) * ((float) $item['unit_price']);
            }

            $discount = (float) ($validated['discount'] ?? 0);
            $total = max(0, $subtotal - $discount);
            $quoteNumber = 'ORC-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $quotation = Quotation::create([
                'quotation_number' => $quoteNumber,
                'service_request_id' => $validated['service_request_id'] ?? null,
                'client_id' => $validated['client_id'],
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'status' => $validated['status'],
                'valid_until' => $validated['valid_until'],
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $qty = (int) $item['quantity'];
                $unit = (float) $item['unit_price'];

                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'service_id' => $item['service_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'total_price' => $qty * $unit,
                ]);
            }

            if (! empty($validated['service_request_id']) && $validated['status'] === 'sent') {
                $sr = ServiceRequest::find($validated['service_request_id']);
                if ($sr) {
                    $oldStatus = $sr->status;
                    $sr->update(['status' => 'quotation_sent']);
                    RequestStatusHistory::create([
                        'service_request_id' => $sr->id,
                        'user_id' => Auth::id(),
                        'old_status' => $oldStatus,
                        'new_status' => 'quotation_sent',
                        'comment' => "Orçamento {$quoteNumber} emitido no valor de R$ ".number_format($total, 2, ',', '.'),
                    ]);
                }
            }

            return $quotation;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'quotation.created',
            'subject_type' => Quotation::class,
            'subject_id' => $quotation->id,
            'details' => [
                'quotation_number' => $quotation->quotation_number,
                'total' => $quotation->total,
                'status' => $quotation->status,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.quotations.show', $quotation)
            ->with('success', "Orçamento {$quotation->quotation_number} criado com sucesso!");
    }

    public function show(Quotation $quotation): View
    {
        $quotation->load(['client', 'creator', 'serviceRequest', 'items.service', 'project', 'contract']);

        return view('admin.quotations.show', compact('quotation'));
    }

    public function updateStatus(Request $request, Quotation $quotation): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:draft,sent,approved,rejected,expired'],
            'notes' => ['nullable', 'string'],
        ]);

        $oldStatus = $quotation->status;

        $updatePayload = [
            'status' => $validated['status'],
            'notes' => array_key_exists('notes', $validated) && $validated['notes'] !== null
                ? $validated['notes']
                : $quotation->notes,
        ];

        if ($validated['status'] === 'approved' && ! $quotation->approved_at) {
            $updatePayload['approved_at'] = now();
        }

        $quotation->update($updatePayload);

        if ($quotation->serviceRequest) {
            $sr = $quotation->serviceRequest;
            $srOld = $sr->status;

            if ($validated['status'] === 'approved' && ! in_array($sr->status, ['in_progress', 'completed'], true)) {
                $sr->update(['status' => 'approved']);
                RequestStatusHistory::create([
                    'service_request_id' => $sr->id,
                    'user_id' => Auth::id(),
                    'old_status' => $srOld,
                    'new_status' => 'approved',
                    'comment' => "Orçamento {$quotation->quotation_number} aprovado.",
                ]);
            } elseif ($validated['status'] === 'sent' && in_array($sr->status, ['new', 'analyzing', 'awaiting_info'], true)) {
                $sr->update(['status' => 'quotation_sent']);
                RequestStatusHistory::create([
                    'service_request_id' => $sr->id,
                    'user_id' => Auth::id(),
                    'old_status' => $srOld,
                    'new_status' => 'quotation_sent',
                    'comment' => "Orçamento {$quotation->quotation_number} enviado ao cliente.",
                ]);
            }
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'quotation.status_updated',
            'subject_type' => Quotation::class,
            'subject_id' => $quotation->id,
            'details' => [
                'quotation_number' => $quotation->quotation_number,
                'from' => $oldStatus,
                'to' => $validated['status'],
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Status do orçamento atualizado com sucesso!');
    }

    public function convertToProject(Request $request, Quotation $quotation): RedirectResponse
    {
        if ($quotation->project) {
            return redirect()->route('admin.projects.show', $quotation->project)
                ->with('success', 'Este orçamento já foi convertido em projeto.');
        }

        $project = DB::transaction(function () use ($quotation): Project {
            if ($quotation->status !== 'approved') {
                $quotation->update([
                    'status' => 'approved',
                    'approved_at' => $quotation->approved_at ?? now(),
                ]);
            }

            $firstServiceId = $quotation->items()->whereNotNull('service_id')->value('service_id')
                ?? $quotation->serviceRequest?->service_id;

            $project = Project::create([
                'code' => 'PRJ-'.date('Y').'-'.strtoupper(Str::random(5)),
                'client_id' => $quotation->client_id,
                'service_id' => $firstServiceId,
                'quotation_id' => $quotation->id,
                'service_request_id' => $quotation->service_request_id,
                'manager_id' => Auth::id(),
                'name' => $quotation->title,
                'description' => $quotation->notes ?: 'Projeto originado do orçamento '.$quotation->quotation_number,
                'status' => 'in_progress',
                'progress_percentage' => 20,
                'start_date' => Carbon::now(),
                'deadline' => Carbon::now()->addDays(30),
                'budget' => $quotation->total,
            ]);

            $stages = [
                ['title' => '1. Kickoff e Arquitetura', 'description' => 'Alinhamento de escopo conforme proposta aprovada.', 'order' => 1, 'status' => 'completed', 'completed_at' => now()],
                ['title' => '2. Design & Prototipagem', 'description' => 'Validação de layout e experiência do usuário.', 'order' => 2, 'status' => 'in_progress'],
                ['title' => '3. Implementação Técnica', 'description' => 'Desenvolvimento de funcionalidades e integrações.', 'order' => 3, 'status' => 'pending'],
                ['title' => '4. QA, Segurança & Performance', 'description' => 'Homologação e testes automatizados.', 'order' => 4, 'status' => 'pending'],
                ['title' => '5. Go-Live e Entrega Final', 'description' => 'Publicação em produção e treinamento.', 'order' => 5, 'status' => 'pending'],
            ];

            foreach ($stages as $stage) {
                $project->stages()->create($stage);
            }

            if ($quotation->serviceRequest) {
                $sr = $quotation->serviceRequest;
                $srOld = $sr->status;
                $sr->update(['status' => 'in_progress']);
                RequestStatusHistory::create([
                    'service_request_id' => $sr->id,
                    'user_id' => Auth::id(),
                    'old_status' => $srOld,
                    'new_status' => 'in_progress',
                    'comment' => "Orçamento {$quotation->quotation_number} convertido no Projeto {$project->code}.",
                ]);
            }

            return $project;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'quotation.converted_to_project',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => [
                'quotation_number' => $quotation->quotation_number,
                'project_code' => $project->code,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.projects.show', $project)
            ->with('success', "Orçamento convertido no projeto {$project->code} com sucesso!");
    }

    public function destroy(Request $request, Quotation $quotation): RedirectResponse
    {
        $number = $quotation->quotation_number;
        $quotationId = $quotation->id;
        $quotation->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'quotation.deleted',
            'subject_type' => Quotation::class,
            'subject_id' => $quotationId,
            'details' => ['quotation_number' => $number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.quotations.index')->with('success', "Orçamento {$number} excluído com sucesso.");
    }
}
