<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->foreignId('quotation_id')->nullable()->constrained('quotations')->nullOnDelete();
            $table->foreignId('service_request_id')->nullable()->constrained('service_requests')->nullOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('status', [
                'planning',
                'in_progress',
                'on_hold',
                'reviewing',
                'completed',
                'cancelled',
            ])->default('planning');
            $table->integer('progress_percentage')->default(0);
            $table->date('start_date')->nullable();
            $table->date('deadline')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->decimal('budget', 12, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('project_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('order')->default(0);
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->date('deadline')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('project_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_in_project')->default('Membro');
            $table->timestamps();
        });

        Schema::create('project_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('stage_id')->nullable()->constrained('project_stages')->nullOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->integer('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_client_visible')->default(true);
            $table->timestamps();
        });

        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->string('contract_number', 50)->unique();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->foreignId('quotation_id')->nullable()->constrained('quotations')->nullOnDelete();
            $table->string('title');
            $table->longText('content')->nullable();
            $table->decimal('total_value', 12, 2)->default(0);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->enum('status', ['draft', 'active', 'suspended', 'completed', 'cancelled'])->default('draft');
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('domains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('domain_name')->unique();
            $table->string('registrar')->default('Registro.br');
            $table->date('registration_date')->nullable();
            $table->date('expiration_date');
            $table->decimal('renewal_price', 10, 2)->nullable();
            $table->enum('status', ['active', 'pending', 'expiring_soon', 'expired', 'transferred'])->default('active');
            $table->boolean('auto_renew')->default(false);
            $table->text('nameservers')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('domain_renewals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('domain_id')->constrained('domains')->cascadeOnDelete();
            $table->date('renewal_date');
            $table->date('next_expiration_date');
            $table->decimal('amount', 10, 2);
            $table->string('invoice_number')->nullable();
            $table->timestamps();
        });

        Schema::create('dns_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('domain_id')->constrained('domains')->cascadeOnDelete();
            $table->enum('type', ['A', 'CNAME', 'MX', 'TXT', 'NS', 'AAAA'])->default('A');
            $table->string('host');
            $table->string('value');
            $table->integer('ttl')->default(3600);
            $table->integer('priority')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dns_records');
        Schema::dropIfExists('domain_renewals');
        Schema::dropIfExists('domains');
        Schema::dropIfExists('contracts');
        Schema::dropIfExists('project_attachments');
        Schema::dropIfExists('project_members');
        Schema::dropIfExists('project_stages');
        Schema::dropIfExists('projects');
    }
};
