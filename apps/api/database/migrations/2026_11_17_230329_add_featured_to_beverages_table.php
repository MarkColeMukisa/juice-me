<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Written once by `nevela field`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('beverages', function (Blueprint $table) {
            $table->boolean('featured')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('beverages', function (Blueprint $table) {
            $table->dropColumn('featured');
        });
    }
};
