<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Advertising Campaigns
        Schema::create('advertising_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->string('name');
            $table->enum('platform', ['meta_ads', 'google_ads', 'tiktok_ads', 'linkedin_ads'])->default('meta_ads');
            $table->enum('status', ['draft', 'active', 'paused', 'ended'])->default('draft');
            $table->decimal('budget', 12, 2)->default(0);
            $table->decimal('spent', 12, 2)->default(0);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('target_audience')->nullable();
            $table->string('objective')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('campaign_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('advertising_campaigns')->cascadeOnDelete();
            $table->date('date');
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->integer('conversions')->default(0);
            $table->decimal('spend', 10, 2)->default(0);
            $table->decimal('cpc', 10, 2)->default(0);
            $table->decimal('cpa', 10, 2)->default(0);
            $table->decimal('roas', 8, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Financial
        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->enum('type', ['income', 'expense']);
            $table->string('category');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('amount', 12, 2);
            $table->date('due_date');
            $table->date('paid_date')->nullable();
            $table->enum('status', ['pending', 'paid', 'cancelled', 'overdue'])->default('pending');
            $table->string('payment_method')->nullable();
            $table->string('invoice_url')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('financial_transaction_id')->constrained('financial_transactions')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->enum('payment_method', ['pix', 'credit_card', 'bank_slip', 'transfer'])->default('pix');
            $table->enum('status', ['pending', 'approved', 'failed', 'refunded'])->default('pending');
            $table->string('transaction_id')->nullable();
            $table->string('proof_path')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });

        // Chat & Attendance
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // Attendant
            $table->string('subject');
            $table->string('channel')->default('web_chat');
            $table->enum('status', ['open', 'waiting_client', 'waiting_staff', 'closed'])->default('open');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('conversation_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->enum('sender_type', ['client', 'staff']);
            $table->text('message');
            $table->string('attachment_path')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // Notifications
        Schema::create('notifications_custom', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('info');
            $table->string('action_url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // Content: Blog & Portfolio
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();
            $table->longText('content');
            $table->string('cover_image')->nullable();
            $table->string('category')->default('Tecnologia');
            $table->json('tags')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('portfolio_projects', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('client_name');
            $table->string('category');
            $table->text('description');
            $table->text('challenge')->nullable();
            $table->text('solution')->nullable();
            $table->text('results')->nullable();
            $table->string('cover_image')->nullable();
            $table->json('gallery_images')->nullable();
            $table->string('live_url')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });

        // Activity Logs
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('details')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });

        // System Settings
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('group')->default('general');
            $table->string('type')->default('string');
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('portfolio_projects');
        Schema::dropIfExists('blog_posts');
        Schema::dropIfExists('notifications_custom');
        Schema::dropIfExists('conversation_messages');
        Schema::dropIfExists('conversations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('campaign_metrics');
        Schema::dropIfExists('advertising_campaigns');
    }
};
