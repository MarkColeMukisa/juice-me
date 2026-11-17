<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Generated once by Nevela. Later descriptor changes need a new migration of your own.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('title');
            $table->string('subtitle')->nullable();
            $table->string('image', 512)->nullable();
            $table->foreignUuid('category_id')->nullable()->index()->constrained('categories')->nullOnDelete();
            $table->boolean('active')->default(true);
            $table->integer('position')->default(0);
            $table->timestamps();
            // When a record was deleted. Until it is removed for good it sits in the trash.
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banners');
    }
};
