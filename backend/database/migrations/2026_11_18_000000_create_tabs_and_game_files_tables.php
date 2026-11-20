<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('game_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('original_name');
            $table->string('display_name');
            $table->string('filename');
            $table->string('file_path')->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->string('status')->default('ready');
            $table->timestamps();
        });

        Schema::create('tabs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('game_name');
            $table->foreignId('game_file_id')->nullable()->constrained('game_files')->nullOnDelete();
            $table->string('emulator')->default('MicroEmulator');
            $table->string('status')->default('running'); // running, stopped
            $table->string('online_status')->default('Đang online server game');
            $table->string('mode')->default('Chạy nền (background)');
            $table->integer('fps')->default(50);
            $table->integer('restart_count')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->json('events')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tabs');
        Schema::dropIfExists('game_files');
    }
};
