<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table): void {
            if (! Schema::hasColumn('clients', 'trade_name')) {
                $table->string('trade_name')->nullable()->after('company_name');
            }
        });

        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_sender_id_foreign');
            DB::statement('ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_sender_id_foreign FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (LOWER(email))');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS domains_name_lower_unique ON domains (LOWER(domain_name))');
        } elseif ($driver === 'mysql' || $driver === 'mariadb') {
            Schema::table('conversation_messages', function (Blueprint $table): void {
                $table->dropForeign(['sender_id']);
                $table->foreign('sender_id')->references('id')->on('users')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS domains_name_lower_unique');
            DB::statement('DROP INDEX IF EXISTS users_email_lower_unique');
            DB::statement('ALTER TABLE conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_sender_id_foreign');
            DB::statement('ALTER TABLE conversation_messages ADD CONSTRAINT conversation_messages_sender_id_foreign FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE');
        } elseif ($driver === 'mysql' || $driver === 'mariadb') {
            Schema::table('conversation_messages', function (Blueprint $table): void {
                $table->dropForeign(['sender_id']);
                $table->foreign('sender_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }

        Schema::table('clients', function (Blueprint $table): void {
            if (Schema::hasColumn('clients', 'trade_name')) {
                $table->dropColumn('trade_name');
            }
        });
    }
};
