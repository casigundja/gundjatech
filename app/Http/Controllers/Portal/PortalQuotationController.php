<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Quotation;
use App\Models\RequestStatusHistory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\View\View;

class PortalQuotationController extends Controller
{
    public function index(): View
    {
        $client = Auth::user()->client;
        $quotations = Quotation::where('client_id', $client ? $client->id : 0)
            ->where('status', '!=', 'draft')
            ->with(['serviceRequest', 'items'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return view('portal.quotations.index', compact('quotations'));
    }

    public function show(Quotation $quotation): View
    {
        Gate::authorize('view', $quotation);

        if ($quotation->status === 'draft' && ! Auth::user()->isStaff()) {
            abort(403, 'Esta proposta ainda está em elaboração interna.');
        }

        $quotation->load(['serviceRequest', 'items']);

        return view('portal.quotations.show', compact('quotation'));
    }

    public function approve(Request $request, Quotation $quotation): RedirectResponse
    {
        Gate::authorize('approve', $quotation);

        if ($quotation->status !== 'sent') {
            return back()->with('error', 'Este orçamento não está mais disponível para aprovação.');
        }

        if ($quotation->valid_until !== null && $quotation->valid_until->endOfDay()->isPast()) {
            return back()->with('error', 'Este orçamento está expirado. Solicite uma nova proposta à nossa equipe.');
        }

        DB::transaction(function () use ($quotation): void {
            $quotation->update([
                'status' => 'approved',
                'approved_at' => now(),
            ]);

            if ($quotation->serviceRequest) {
                $oldStatus = $quotation->serviceRequest->status;
                $quotation->serviceRequest->update(['status' => 'approved']);

                RequestStatusHistory::create([
                    'service_request_id' => $quotation->serviceRequest->id,
                    'old_status' => $oldStatus,
                    'new_status' => 'approved',
                    'comment' => "Orçamento {$quotation->quotation_number} aprovado pelo cliente via Portal!",
                    'user_id' => Auth::id(),
                ]);
            }
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'portal.quotation_approved',
            'subject_type' => Quotation::class,
            'subject_id' => $quotation->id,
            'details' => ['quotation_number' => $quotation->quotation_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Orçamento aprovado com sucesso! Nossa equipe iniciará a configuração do seu projeto.');
    }

    public function reject(Request $request, Quotation $quotation): RedirectResponse
    {
        Gate::authorize('reject', $quotation);

        if ($quotation->status !== 'sent') {
            return back()->with('error', 'Este orçamento não pode mais ser recusado.');
        }

        if ($quotation->valid_until !== null && $quotation->valid_until->endOfDay()->isPast()) {
            return back()->with('error', 'Este orçamento já expirou.');
        }

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($quotation, $validated): void {
            $notes = $quotation->notes;
            if (! empty($validated['reason'])) {
                $notes = trim(($notes ? $notes."\n\n" : '').'Motivo da recusa pelo cliente: '.$validated['reason']);
            }

            $quotation->update([
                'status' => 'rejected',
                'notes' => $notes,
            ]);

            if ($quotation->serviceRequest) {
                $oldStatus = $quotation->serviceRequest->status;
                $quotation->serviceRequest->update(['status' => 'awaiting_info']);

                RequestStatusHistory::create([
                    'service_request_id' => $quotation->serviceRequest->id,
                    'old_status' => $oldStatus,
                    'new_status' => 'awaiting_info',
                    'comment' => "Orçamento {$quotation->quotation_number} recusado pelo cliente.".(! empty($validated['reason']) ? ' Motivo: '.$validated['reason'] : ''),
                    'user_id' => Auth::id(),
                ]);
            }
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'portal.quotation_rejected',
            'subject_type' => Quotation::class,
            'subject_id' => $quotation->id,
            'details' => ['quotation_number' => $quotation->quotation_number],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Feedback registrado! Nossa equipe comercial entrará em contato para ajustar a proposta.');
    }
}
