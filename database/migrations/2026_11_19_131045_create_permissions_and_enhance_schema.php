<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('module', 60)->index();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role', 40)->index();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['role', 'permission_id']);
        });

        if (! Schema::hasColumn('blog_posts', 'views_count')) {
            Schema::table('blog_posts', function (Blueprint $table) {
                $table->unsignedInteger('views_count')->default(0)->after('is_published');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('blog_posts', 'views_count')) {
            Schema::table('blog_posts', function (Blueprint $table) {
                $table->dropColumn('views_count');
            });
        }

        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
    }
};
