<?php

namespace App\Http\Controllers\Admin;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectAttachment;
use App\Models\ProjectMember;
use App\Models\ProjectStage;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminProjectController extends Controller
{
    public function index(Request $request): View
    {
        $query = Project::with(['client', 'service', 'manager']);

        if ($request->filled('status')) {
            $status = $request->status === 'review' ? 'reviewing' : $request->status;
            $query->where('status', $status);
        }

        if ($request->filled('search')) {
            $like = '%'.mb_strtolower(trim((string) $request->search)).'%';
            $query->where(function ($q) use ($like): void {
                $q->whereRaw('LOWER(code) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(name) LIKE ?', [$like]);
            });
        }

        $projects = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        return view('admin.projects.index', compact('projects'));
    }

    public function create(): View
    {
        $clients = Client::where('status', 'active')->orderBy('company_name')->get();
        $services = Service::where('is_active', true)->orderBy('name')->get();
        $managers = User::where('role', '!=', UserRole::Client->value)->where('is_active', true)->orderBy('name')->get();

        return view('admin.projects.create', compact('clients', 'services', 'managers'));
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => ['required', 'exists:clients,id'],
            'service_id' => ['nullable', 'exists:services,id'],
            'manager_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', '!=', UserRole::Client->value)),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'deadline' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'budget' => ['nullable', 'numeric', 'min:0'],
        ]);

        $project = DB::transaction(function () use ($validated): Project {
            $project = Project::create([
                'code' => 'PRJ-'.date('Y').'-'.strtoupper(Str::random(5)),
                'client_id' => $validated['client_id'],
                'service_id' => $validated['service_id'] ?? null,
                'manager_id' => $validated['manager_id'],
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'status' => 'in_progress',
                'progress_percentage' => 0,
                'start_date' => $validated['start_date'] ?? now(),
                'deadline' => $validated['deadline'] ?? $validated['due_date'] ?? null,
                'budget' => $validated['budget'] ?? 0,
            ]);

            $defaultStages = [
                ['title' => '1. Planejamento e Arquitetura', 'description' => 'Definição técnica e cronograma.'],
                ['title' => '2. Design e Identidade', 'description' => 'UI/UX e prototipação visual.'],
                ['title' => '3. Desenvolvimento', 'description' => 'Codificação e integrações.'],
                ['title' => '4. Revisão e Testes', 'description' => 'QA, homologação e ajustes finais.'],
                ['title' => '5. Entrega Oficial', 'description' => 'Deploy em produção e acompanhamento.'],
            ];

            foreach ($defaultStages as $idx => $stage) {
                $project->stages()->create([
                    'title' => $stage['title'],
                    'description' => $stage['description'],
                    'order' => $idx + 1,
                    'status' => $idx === 0 ? 'in_progress' : 'pending',
                ]);
            }

            ProjectMember::firstOrCreate(
                ['project_id' => $project->id, 'user_id' => $validated['manager_id']],
                ['role_in_project' => 'Gerente de Projeto']
            );

            return $project;
        });

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.created',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => ['code' => $project->code, 'name' => $project->name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.projects.show', $project)->with('success', 'Projeto iniciado com sucesso!');
    }

    public function show(Project $project): View
    {
        $project->load(['client', 'service', 'manager', 'stages', 'attachments.uploader', 'members.user', 'quotation']);
        $staffMembers = User::where('role', '!=', UserRole::Client->value)->where('is_active', true)->orderBy('name')->get();

        return view('admin.projects.show', compact('project', 'staffMembers'));
    }

    public function updateProgress(Request $request, Project $project): RedirectResponse
    {
        if ($request->input('status') === 'review') {
            $request->merge(['status' => 'reviewing']);
        }

        if (! $request->filled('progress_percentage') && $request->filled('progress')) {
            $request->merge(['progress_percentage' => $request->input('progress')]);
        }

        $validated = $request->validate([
            'progress_percentage' => ['required', 'integer', 'min:0', 'max:100'],
            'status' => ['required', 'in:planning,in_progress,on_hold,reviewing,completed,cancelled'],
        ]);

        $updateData = [
            'progress_percentage' => (int) $validated['progress_percentage'],
            'status' => $validated['status'],
        ];

        if ($validated['status'] === 'completed') {
            $updateData['completed_at'] = $project->completed_at ?? now();
            $updateData['progress_percentage'] = 100;
        } else {
            $updateData['completed_at'] = null;
        }

        $project->update($updateData);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.progress_updated',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => ['code' => $project->code, 'progress_percentage' => $project->progress_percentage, 'status' => $project->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Progresso do projeto atualizado com sucesso!');
    }

    public function updateStage(Request $request, ProjectStage $stage): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:pending,in_progress,completed'],
            'description' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $description = $validated['description'] ?? $validated['notes'] ?? $stage->description;

        $stage->update([
            'status' => $validated['status'],
            'description' => $description,
            'completed_at' => $validated['status'] === 'completed' ? ($stage->completed_at ?? now()) : null,
        ]);

        $this->recalculateProjectProgress($stage->project);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.stage_updated',
            'subject_type' => Project::class,
            'subject_id' => $stage->project_id,
            'details' => ['stage_title' => $stage->title, 'status' => $stage->status],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Etapa atualizada e progresso recalculado!');
    }

    public function addStage(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'deadline' => ['nullable', 'date'],
        ]);

        $nextOrder = ((int) $project->stages()->max('order')) + 1;

        $stage = $project->stages()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'deadline' => $validated['deadline'] ?? null,
            'order' => $nextOrder,
            'status' => 'pending',
        ]);

        $this->recalculateProjectProgress($project);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.stage_added',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => ['code' => $project->code, 'stage_title' => $stage->title],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Nova etapa adicionada ao cronograma e progresso recalculado!');
    }

    public function addMember(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => [
                'required',
                Rule::exists('users', 'id')->where(fn ($q) => $q->where('role', '!=', UserRole::Client->value)->where('is_active', true)),
            ],
            'role_in_project' => ['required', 'string', 'max:100'],
        ], [
            'user_id.exists' => 'Selecione um profissional ativo da equipe interna.',
        ]);

        ProjectMember::updateOrCreate(
            ['project_id' => $project->id, 'user_id' => $validated['user_id']],
            ['role_in_project' => $validated['role_in_project']]
        );

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.member_added',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => ['code' => $project->code, 'member_user_id' => (int) $validated['user_id'], 'role' => $validated['role_in_project']],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Membro atribuído à equipe do projeto!');
    }

    public function removeMember(Request $request, ProjectMember $member): RedirectResponse
    {
        $projectId = $member->project_id;
        $memberUserId = $member->user_id;
        $member->delete();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.member_removed',
            'subject_type' => Project::class,
            'subject_id' => $projectId,
            'details' => ['member_user_id' => $memberUserId],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Membro removido da equipe do projeto.');
    }

    public function uploadAttachment(Request $request, Project $project): RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,png,jpg,jpeg,webp,zip', 'extensions:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,png,jpg,jpeg,webp,zip'],
            'title' => ['nullable', 'string', 'max:255'],
            'stage_id' => [
                'nullable',
                Rule::exists('project_stages', 'id')->where(fn ($q) => $q->where('project_id', $project->id)),
            ],
            'is_client_visible' => ['nullable', 'boolean'],
        ]);

        $file = $request->file('file');
        $path = $file->store('project_files', 'local');
        $rawDisplayName = ! empty($validated['title'])
            ? $validated['title'].' ('.$file->getClientOriginalName().')'
            : $file->getClientOriginalName();
        $displayName = Str::limit(
            preg_replace('/[\x00-\x1F\x7F]+/', '', str_replace(['/', '\\', "\0"], '-', trim((string) $rawDisplayName))) ?: 'anexo',
            220,
            ''
        );

        try {
            $attachment = ProjectAttachment::create([
                'project_id' => $project->id,
                'stage_id' => $validated['stage_id'] ?? null,
                'file_name' => $displayName,
                'file_path' => $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getMimeType() ?: $file->getClientMimeType(),
                'uploaded_by_user_id' => Auth::id(),
                'is_client_visible' => $request->has('is_client_visible') ? $request->boolean('is_client_visible') : true,
            ]);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.attachment_uploaded',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => ['code' => $project->code, 'attachment_id' => $attachment->id, 'file_name' => $displayName],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Arquivo anexado ao projeto com armazenamento protegido!');
    }

    public function downloadAttachment(Project $project, ProjectAttachment $attachment): StreamedResponse
    {
        if ($attachment->project_id !== $project->id) {
            abort(404);
        }

        $safeName = str_replace(['/', '\\', "\0"], '-', (string) $attachment->file_name) ?: 'anexo';

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($attachment->file_path)) {
                return Storage::disk($disk)->download($attachment->file_path, $safeName);
            }
        }

        abort(404, 'Arquivo não encontrado no servidor.');
    }

    public function deleteAttachment(Request $request, Project $project, ProjectAttachment $attachment): RedirectResponse
    {
        if ($attachment->project_id !== $project->id) {
            abort(404);
        }

        $filePath = $attachment->file_path;
        $fileName = $attachment->file_name;
        $attachment->delete();

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($filePath)) {
                Storage::disk($disk)->delete($filePath);
            }
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.attachment_deleted',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'details' => ['code' => $project->code, 'file_name' => $fileName],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('success', 'Anexo removido do projeto.');
    }

    public function destroy(Request $request, Project $project): RedirectResponse
    {
        $projectId = $project->id;
        $code = $project->code;
        $name = $project->name;
        $attachmentPaths = $project->attachments()->pluck('file_path')->all();

        DB::transaction(function () use ($project): void {
            $project->delete();
        });

        foreach ($attachmentPaths as $filePath) {
            foreach (['local', 'public'] as $disk) {
                if (Storage::disk($disk)->exists($filePath)) {
                    Storage::disk($disk)->delete($filePath);
                }
            }
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'project.deleted',
            'subject_type' => Project::class,
            'subject_id' => $projectId,
            'details' => ['code' => $code, 'name' => $name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.projects.index')
            ->with('success', "Projeto {$code} excluído com sucesso.");
    }

    private function recalculateProjectProgress(Project $project): void
    {
        $totalStages = $project->stages()->count();

        if ($totalStages === 0) {
            return;
        }

        $completedCount = $project->stages()->where('status', 'completed')->count();
        $percentage = (int) round(($completedCount / $totalStages) * 100);

        $project->update([
            'progress_percentage' => $percentage,
            'status' => $percentage === 100 ? 'completed' : ($project->status === 'completed' ? 'in_progress' : $project->status),
            'completed_at' => $percentage === 100 ? ($project->completed_at ?? now()) : null,
        ]);
    }
}
