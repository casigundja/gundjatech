<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\RequestAttachment;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminRequestController extends Controller
{
    public function index(Request $request): View
    {
        $query = ServiceRequest::with(['service', 'client', 'assignedUser']);

        if ($request->filled('status')) {
            $status = $request->status === 'quoted' ? 'quotation_sent' : $request->status;
            $query->where('status', $status);
        }

        if ($request->filled('service_id')) {
            $query->where('service_id', $request->service_id);
        }

        if ($request->filled('search')) {
            $like = '%'.mb_strtolower(trim((string) $request->search)).'%';
            $query->where(function ($q) use ($like): void {
                $q->whereRaw('LOWER(protocol) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(service_title, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(company, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(email) LIKE ?', [$like]);
            });
        }

        $requests = $query->orderBy('created_at', 'desc')->paginate(12)->withQueryString();
        $services = Service::where('is_active', true)->orderBy('name')->get();

        return view('admin.requests.index', compact('requests', 'services'));
    }

    public function show(ServiceRequest $serviceRequest): View
    {
        $serviceRequest->load(['service', 'client', 'assignedUser', 'statusHistories.user', 'attachments', 'quotation.items', 'project']);
        $staffMembers = User::where('role', '!=', 'client')->where('is_active', true)->orderBy('name')->get();

        return view('admin.requests.show', compact('serviceRequest', 'staffMembers'));
    }

    public function downloadAttachment(ServiceRequest $serviceRequest, RequestAttachment $attachment): StreamedResponse
    {
        if ($attachment->service_request_id !== $serviceRequest->id) {
            abort(404);
        }

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($attachment->file_path)) {
                return Storage::disk($disk)->download($attachment->file_path, $attachment->file_name);
            }
        }

        abort(404, 'Arquivo não encontrado no servidor.');
    }

    public function updateStatus(Request $request, ServiceRequest $serviceRequest): RedirectResponse
    {
        $normalizedStatus = match ($request->input('status')) {
            'quoted' => 'quotation_sent',
            'waiting_info' => 'awaiting_info',
            default => $request->input('status'),
        };

        $request->merge(['status' => $normalizedStatus]);

        $validated = $request->validate([
            'status' => ['required', 'in:new,analyzing,awaiting_info,quotation_sent,awaiting_approval,approved,in_progress,completed,cancelled'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'assigned_user_id' => ['nullable', 'exists:users,id'],
            'internal_notes' => ['nullable', 'string'],
        ]);

        $oldStatus = $serviceRequest->status;
        $assignedUserId = $validated['assigned_user_id'] ?? $validated['assigned_to'] ?? $serviceRequest->assigned_user_id;

        $serviceRequest->update([
            'status' => $validated['status'],
            'assigned_user_id' => $assignedUserId,
            'internal_notes' => array_key_exists('internal_notes', $validated)
                ? $validated['internal_notes']
                : $serviceRequest->internal_notes,
        ]);

        if ($oldStatus !== $validated['status'] || ! empty($validated['comment'])) {
            RequestStatusHistory::create([
                'service_request_id' => $serviceRequest->id,
                'old_status' => $oldStatus,
                'new_status' => $validated['status'],
                'comment' => $validated['comment'] ?? 'Status atualizado pela equipe.',
                'user_id' => Auth::id(),
            ]);
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'request.status_updated',
            'subject_type' => ServiceRequest::class,
            'subject_id' => $serviceRequest->id,
            'details' => [
                'protocol' => $serviceRequest->protocol,
                'from' => $oldStatus,
                'to' => $validated['status'],
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Status da solicitação atualizado com sucesso!');
    }

    public function generateQuotation(Request $request, ServiceRequest $serviceRequest): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'valid_until' => ['required', 'date', 'after:today'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $quotation = DB::transaction(function () use ($validated, $serviceRequest): Quotation {
            $clientId = $serviceRequest->client_id;

            if (! $clientId) {
                $client = Client::firstOrCreate(
                    ['email' => $serviceRequest->email],
                    [
                        'user_id' => $serviceRequest->user_id,
                        'name' => $serviceRequest->name,
                        'company_name' => $serviceRequest->company ?: $serviceRequest->name,
                        'phone' => $serviceRequest->phone,
                        'status' => 'lead',
                    ]
                );
                $clientId = $client->id;
                $serviceRequest->update(['client_id' => $clientId]);
            }

            $oldStatus = $serviceRequest->status;
            $quoteNumber = 'ORC-'.date('Ymd').'-'.strtoupper(Str::random(4));
            $subtotal = 0.0;

            foreach ($validated['items'] as $item) {
                $subtotal += ((int) $item['quantity']) * ((float) $item['unit_price']);
            }

            $discount = (float) ($validated['discount'] ?? 0);
            $total = max(0, $subtotal - $discount);

            $quotation = Quotation::create([
                'quotation_number' => $quoteNumber,
                'service_request_id' => $serviceRequest->id,
                'client_id' => $clientId,
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'valid_until' => $validated['valid_until'],
                'notes' => $validated['notes'] ?? null,
                'status' => 'sent',
            ]);

            foreach ($validated['items'] as $item) {
                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'service_id' => $serviceRequest->service_id,
                    'description' => $item['description'],
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => (float) $item['unit_price'],
                    'total_price' => ((int) $item['quantity']) * ((float) $item['unit_price']),
                ]);
            }

            $serviceRequest->update(['status' => 'quotation_sent']);

            RequestStatusHistory::create([
                'service_request_id' => $serviceRequest->id,
                'old_status' => $oldStatus,
                'new_status' => 'quotation_sent',
                'comment' => "Orçamento nº {$quoteNumber} gerado no valor de R$ ".number_format($total, 2, ',', '.'),
                'user_id' => Auth::id(),
            ]);

            return $quotation;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'quotation.generated_from_request',
            'subject_type' => Quotation::class,
            'subject_id' => $quotation->id,
            'details' => [
                'quotation_number' => $quotation->quotation_number,
                'protocol' => $serviceRequest->protocol,
                'total' => $quotation->total,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', "Orçamento {$quotation->quotation_number} gerado com sucesso e enviado ao cliente!");
    }

    public function convertToProject(Request $request, ServiceRequest $serviceRequest): RedirectResponse
    {
        if ($serviceRequest->project) {
            return redirect()->route('admin.projects.show', $serviceRequest->project)
                ->with('success', 'Esta solicitação já possui um projeto vinculado.');
        }

        $project = DB::transaction(function () use ($serviceRequest): Project {
            $clientId = $serviceRequest->client_id;

            if (! $clientId) {
                $client = Client::firstOrCreate(
                    ['email' => $serviceRequest->email],
                    [
                        'user_id' => $serviceRequest->user_id,
                        'name' => $serviceRequest->name,
                        'company_name' => $serviceRequest->company ?: $serviceRequest->name,
                        'phone' => $serviceRequest->phone,
                        'status' => 'active',
                    ]
                );
                $clientId = $client->id;
                $serviceRequest->update(['client_id' => $clientId]);
            }

            $oldStatus = $serviceRequest->status;
            $code = 'PRJ-'.date('Y').'-'.strtoupper(Str::random(5));

            $project = Project::create([
                'code' => $code,
                'client_id' => $clientId,
                'service_id' => $serviceRequest->service_id,
                'quotation_id' => $serviceRequest->quotation?->id,
                'service_request_id' => $serviceRequest->id,
                'manager_id' => $serviceRequest->assigned_user_id ?? Auth::id(),
                'name' => $serviceRequest->service_title ?: 'Projeto '.$serviceRequest->protocol,
                'description' => $serviceRequest->description,
                'status' => 'in_progress',
                'progress_percentage' => 20,
                'start_date' => Carbon::now(),
                'deadline' => $serviceRequest->desired_deadline ?? Carbon::now()->addDays(30),
                'budget' => $serviceRequest->quotation?->total ?? $serviceRequest->estimated_budget ?? 0,
            ]);

            $stages = [
                ['title' => '1. Briefing e Planejamento', 'description' => 'Levantamento técnico e arquitetura inicial.', 'order' => 1, 'status' => 'completed', 'completed_at' => now()],
                ['title' => '2. Design de Interface (UI/UX)', 'description' => 'Prototipação visual e validação com o cliente.', 'order' => 2, 'status' => 'in_progress'],
                ['title' => '3. Desenvolvimento e Engenharia', 'description' => 'Implementação backend, frontend e integrações.', 'order' => 3, 'status' => 'pending'],
                ['title' => '4. Testes, Homologação e QA', 'description' => 'Garantia de qualidade, segurança e performance.', 'order' => 4, 'status' => 'pending'],
                ['title' => '5. Lançamento e Otimização', 'description' => 'Publicação em produção e monitoramento inicial.', 'order' => 5, 'status' => 'pending'],
            ];

            foreach ($stages as $stage) {
                $project->stages()->create($stage);
            }

            $serviceRequest->update(['status' => 'in_progress']);

            RequestStatusHistory::create([
                'service_request_id' => $serviceRequest->id,
                'old_status' => $oldStatus,
                'new_status' => 'in_progress',
                'comment' => "Solicitação convertida no Projeto [{$project->code}] {$project->name}",
                'user_id' => Auth::id(),
            ]);

            return $project;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'request.converted_to_project',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => [
                'project_code' => $project->code,
                'protocol' => $serviceRequest->protocol,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.projects.show', $project)->with('success', "Projeto {$project->code} criado com sucesso!");
    }
}
