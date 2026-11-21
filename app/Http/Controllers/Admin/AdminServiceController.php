<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Services\AutonomousCrmAgent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AdminServiceController extends Controller
{
    public function index(Request $request): View
    {
        $categories = ServiceCategory::withCount('services')->orderBy('order')->get();
        $query = Service::with('category')->orderBy('id', 'desc');

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->category_id);
        }

        $services = $query->paginate(15)->withQueryString();

        return view('admin.services.index', compact('categories', 'services'));
    }

    public function create(): View
    {
        $categories = ServiceCategory::orderBy('order')->get();

        return view('admin.services.create', compact('categories'));
    }

    public function store(Request $request): RedirectResponse
    {
        $categoryId = $request->input('category_id', $request->input('service_category_id'));
        $request->merge(['category_id' => $categoryId]);

        $validated = $request->validate([
            'category_id' => ['required', 'exists:service_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'full_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'starting_price' => ['nullable', 'numeric', 'min:0'],
            'billing_type' => ['required', 'in:one_time,monthly,yearly'],
            'estimated_days' => ['nullable', 'integer', 'min:1'],
            'estimated_delivery_days' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
        ]);

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;
        while (Service::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$counter;
            $counter++;
        }

        $service = Service::create([
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'slug' => $slug,
            'short_description' => $validated['short_description'] ?? null,
            'full_description' => $validated['full_description'] ?? $validated['description'] ?? null,
            'base_price' => $validated['base_price'] ?? $validated['starting_price'] ?? 0,
            'billing_type' => $validated['billing_type'],
            'estimated_days' => $validated['estimated_days'] ?? $validated['estimated_delivery_days'] ?? 10,
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : false,
            'is_featured' => $request->boolean('is_featured'),
        ]);

        AutonomousCrmAgent::flushCache();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'service.created',
            'subject_type' => Service::class,
            'subject_id' => $service->id,
            'details' => ['name' => $service->name, 'base_price' => $service->base_price],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.services.index')->with('success', 'Serviço cadastrado com sucesso!');
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $baseSlug = Str::slug($validated['name']);
        $slug = $baseSlug;
        $counter = 1;
        while (ServiceCategory::where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$counter;
            $counter++;
        }

        ServiceCategory::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'order' => ((int) ServiceCategory::max('order')) + 1,
            'is_active' => true,
        ]);

        AutonomousCrmAgent::flushCache();

        return redirect()->route('admin.services.index')->with('success', 'Categoria de serviço criada com sucesso!');
    }

    public function edit(Service $service): View
    {
        $categories = ServiceCategory::orderBy('order')->get();

        return view('admin.services.edit', compact('service', 'categories'));
    }

    public function update(Request $request, Service $service): RedirectResponse
    {
        $categoryId = $request->input('category_id', $request->input('service_category_id'));
        $request->merge(['category_id' => $categoryId]);

        $validated = $request->validate([
            'category_id' => ['required', 'exists:service_categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'full_description' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'base_price' => ['nullable', 'numeric', 'min:0'],
            'starting_price' => ['nullable', 'numeric', 'min:0'],
            'billing_type' => ['required', 'in:one_time,monthly,yearly'],
            'estimated_days' => ['nullable', 'integer', 'min:1'],
            'estimated_delivery_days' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['nullable', 'boolean'],
            'is_featured' => ['nullable', 'boolean'],
        ]);

        $service->update([
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'short_description' => $validated['short_description'] ?? null,
            'full_description' => $validated['full_description'] ?? $validated['description'] ?? $service->full_description,
            'base_price' => $validated['base_price'] ?? $validated['starting_price'] ?? $service->base_price,
            'billing_type' => $validated['billing_type'],
            'estimated_days' => $validated['estimated_days'] ?? $validated['estimated_delivery_days'] ?? $service->estimated_days,
            'is_active' => $request->boolean('is_active'),
            'is_featured' => $request->boolean('is_featured'),
        ]);

        AutonomousCrmAgent::flushCache();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'service.updated',
            'subject_type' => Service::class,
            'subject_id' => $service->id,
            'details' => ['name' => $service->name, 'is_active' => $service->is_active],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.services.index')->with('success', 'Serviço atualizado com sucesso!');
    }

    public function destroy(Request $request, Service $service): RedirectResponse
    {
        $name = $service->name;
        $serviceId = $service->id;
        $service->delete();
        AutonomousCrmAgent::flushCache();

        ActivityLog::create([
            'user_id' => Auth::id(),
            'action' => 'service.deleted',
            'subject_type' => Service::class,
            'subject_id' => $serviceId,
            'details' => ['name' => $name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->route('admin.services.index')->with('success', 'Serviço excluído!');
    }
}
