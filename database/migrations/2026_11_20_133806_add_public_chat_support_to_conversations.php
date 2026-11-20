<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table): void {
            if (! Schema::hasColumn('conversations', 'visitor_token')) {
                $table->string('visitor_token', 64)->nullable()->unique()->after('channel');
            }
            if (! Schema::hasColumn('conversations', 'visitor_name')) {
                $table->string('visitor_name')->nullable()->after('visitor_token');
            }
            if (! Schema::hasColumn('conversations', 'visitor_email')) {
                $table->string('visitor_email')->nullable()->after('visitor_name');
            }
            if (! Schema::hasColumn('conversations', 'visitor_phone')) {
                $table->string('visitor_phone', 40)->nullable()->after('visitor_email');
            }
        });

        Schema::table('conversation_messages', function (Blueprint $table): void {
            $table->unsignedBigInteger('sender_id')->nullable()->change();

            if (! Schema::hasColumn('conversation_messages', 'sender_name')) {
                $table->string('sender_name', 150)->nullable()->after('sender_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('conversation_messages', function (Blueprint $table): void {
            if (Schema::hasColumn('conversation_messages', 'sender_name')) {
                $table->dropColumn('sender_name');
            }
        });

        Schema::table('conversations', function (Blueprint $table): void {
            $columns = array_values(array_filter(
                ['visitor_token', 'visitor_name', 'visitor_email', 'visitor_phone'],
                static fn (string $col): bool => Schema::hasColumn('conversations', $col)
            ));

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
