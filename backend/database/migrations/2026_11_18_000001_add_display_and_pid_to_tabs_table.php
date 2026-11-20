<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tabs', function (Blueprint $table) {
            $table->integer('display')->nullable()->after('fps');
            $table->integer('pid')->nullable()->after('display');
        });
    }

    public function down(): void
    {
        Schema::table('tabs', function (Blueprint $table) {
            $table->dropColumn(['display', 'pid']);
        });
    }
};
