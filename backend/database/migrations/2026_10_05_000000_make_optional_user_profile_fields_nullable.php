<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('my_name')->nullable()->change();
            $table->string('address')->nullable()->change();
            $table->string('university')->nullable()->change();
            $table->string('avatar')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('my_name')->nullable(false)->change();
            $table->string('address')->nullable(false)->change();
            $table->string('university')->nullable(false)->change();
            $table->string('avatar')->nullable(false)->change();
        });
    }
};
