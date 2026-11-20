<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table): void {
            if (! Schema::hasColumn('conversations', 'service_request_id')) {
                $table->foreignId('service_request_id')->nullable()->after('client_id')->constrained('service_requests')->nullOnDelete();
            }
            if (! Schema::hasColumn('conversations', 'ai_enabled')) {
                $table->boolean('ai_enabled')->default(true)->after('status');
            }
            if (! Schema::hasColumn('conversations', 'crm_stage')) {
                $table->string('crm_stage', 40)->default('new')->after('ai_enabled');
            }
            if (! Schema::hasColumn('conversations', 'lead_score')) {
                $table->unsignedTinyInteger('lead_score')->default(0)->after('crm_stage');
            }
            if (! Schema::hasColumn('conversations', 'ai_summary')) {
                $table->text('ai_summary')->nullable()->after('lead_score');
            }
            if (! Schema::hasColumn('conversations', 'extracted_data')) {
                $table->json('extracted_data')->nullable()->after('ai_summary');
            }
            if (! Schema::hasColumn('conversations', 'ai_handoff_reason')) {
                $table->string('ai_handoff_reason', 255)->nullable()->after('extracted_data');
            }
        });

        Schema::table('conversation_messages', function (Blueprint $table): void {
            if (! Schema::hasColumn('conversation_messages', 'is_ai')) {
                $table->boolean('is_ai')->default(false)->after('sender_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('conversation_messages', function (Blueprint $table): void {
            if (Schema::hasColumn('conversation_messages', 'is_ai')) {
                $table->dropColumn('is_ai');
            }
        });

        Schema::table('conversations', function (Blueprint $table): void {
            if (Schema::hasColumn('conversations', 'service_request_id')) {
                $table->dropConstrainedForeignId('service_request_id');
            }
            $columns = array_values(array_filter(
                ['ai_enabled', 'crm_stage', 'lead_score', 'ai_summary', 'extracted_data', 'ai_handoff_reason'],
                static fn (string $col): bool => Schema::hasColumn('conversations', $col)
            ));
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
