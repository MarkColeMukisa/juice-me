<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// The drinks each person likes: one row each, gone when they unlike it.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('beverage_id')->constrained('beverages')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'beverage_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('likes');
    }
};
