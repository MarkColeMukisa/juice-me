<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Generated once by Nevela. Later descriptor changes need a new migration of your own.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('beverages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2);
            $table->string('size')->default('medium')->index();
            $table->string('image', 512)->nullable();
            $table->foreignUuid('category_id')->index()->constrained('categories');
            $table->boolean('available')->default(true);
            $table->timestamps();
            // When a record was deleted. Until it is removed for good it sits in the trash.
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beverages');
    }
};
