<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_id');
            $table->string('entity_type');
            $table->string('entity_id')->nullable();
            $table->string('action');
            $table->json('payload')->nullable();
            $table->enum('status', ['pending', 'synced', 'failed'])->default('pending');
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('status');
            $table->index('device_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
