<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\RequestAttachment;
use App\Models\RequestStatusHistory;
use App\Models\Service;
use App\Models\ServiceRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PortalRequestController extends Controller
{
    public function index(): View
    {
        $client = Auth::user()->client;
        $requests = ServiceRequest::where('client_id', $client ? $client->id : 0)
            ->with(['service', 'quotation'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return view('portal.requests.index', compact('requests'));
    }

    public function create(): View
    {
        $services = Service::where('is_active', true)->with('category')->orderBy('name')->get();

        return view('portal.requests.create', compact('services'));
    }

    public function store(Request $request): RedirectResponse
    {
        $client = Auth::user()->ensureClientProfile();

        $validated = $request->validate([
            'service_id' => ['required', 'exists:services,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:5000'],
            'estimated_budget' => ['nullable', 'numeric', 'min:0'],
            'desired_deadline' => ['nullable', 'date', 'after:today'],
            'attachment' => ['nullable', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,png,jpg,jpeg,webp,zip'],
        ]);

        $protocol = 'GNDJ-'.date('Ymd').'-'.strtoupper(Str::random(4));

        $serviceRequest = DB::transaction(function () use ($request, $validated, $client, $protocol): ServiceRequest {
            $serviceRequest = ServiceRequest::create([
                'protocol' => $protocol,
                'client_id' => $client ? $client->id : null,
                'user_id' => Auth::id(),
                'service_id' => $validated['service_id'],
                'name' => Auth::user()->name,
                'company' => $client ? $client->display_name : Auth::user()->name,
                'email' => Auth::user()->email,
                'phone' => Auth::user()->phone,
                'service_title' => $validated['title'],
                'description' => $validated['description'],
                'estimated_budget' => $validated['estimated_budget'] ?? null,
                'desired_deadline' => $validated['desired_deadline'] ?? null,
                'status' => 'new',
            ]);

            RequestStatusHistory::create([
                'service_request_id' => $serviceRequest->id,
                'old_status' => null,
                'new_status' => 'new',
                'comment' => 'Solicitação aberta diretamente pelo Portal do Cliente.',
                'user_id' => Auth::id(),
            ]);

            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $path = $file->store('attachments', 'local');

                RequestAttachment::create([
                    'service_request_id' => $serviceRequest->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                    'uploaded_by_user_id' => Auth::id(),
                ]);
            }

            return $serviceRequest;
        });

        return redirect()->route('portal.requests.show', $serviceRequest)
            ->with('success', "Solicitação {$protocol} enviada com sucesso!");
    }

    public function show(ServiceRequest $serviceRequest): View
    {
        Gate::authorize('view', $serviceRequest);

        $serviceRequest->load(['service', 'statusHistories.user', 'attachments', 'quotation.items']);

        return view('portal.requests.show', compact('serviceRequest'));
    }

    public function downloadAttachment(ServiceRequest $serviceRequest, RequestAttachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $serviceRequest);

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
}
