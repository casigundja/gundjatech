<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectAttachment;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PortalProjectController extends Controller
{
    public function index(): View
    {
        $client = Auth::user()->client;
        $projects = Project::where('client_id', $client ? $client->id : 0)
            ->with(['stages', 'service', 'manager'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return view('portal.projects.index', compact('projects'));
    }

    public function show(Project $project): View
    {
        Gate::authorize('view', $project);

        $project->load([
            'stages',
            'service',
            'manager',
            'attachments' => fn ($q) => $q->where('is_client_visible', true),
        ]);

        return view('portal.projects.show', compact('project'));
    }

    public function downloadAttachment(Project $project, ProjectAttachment $attachment): StreamedResponse
    {
        Gate::authorize('view', $project);

        if ($attachment->project_id !== $project->id) {
            abort(404);
        }

        if (! $attachment->is_client_visible && ! Auth::user()->isStaff()) {
            abort(403, 'Este anexo é restrito à equipe interna.');
        }

        $safeName = str_replace(['/', '\\', "\0"], '-', (string) $attachment->file_name) ?: 'anexo';

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($attachment->file_path)) {
                return Storage::disk($disk)->download($attachment->file_path, $safeName);
            }
        }

        abort(404, 'Arquivo não encontrado no servidor.');
    }
}
