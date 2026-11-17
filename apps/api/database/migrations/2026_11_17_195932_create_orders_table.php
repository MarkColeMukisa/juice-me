<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Generated once by Nevela. Later descriptor changes need a new migration of your own.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number')->unique();
            $table->string('customer');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->string('delivery')->default('collection')->index();
            $table->text('details')->nullable();
            $table->string('status')->default('pending')->index();
            $table->decimal('total', 12, 2)->nullable();
            $table->timestamps();
            // When a record was deleted. Until it is removed for good it sits in the trash.
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
