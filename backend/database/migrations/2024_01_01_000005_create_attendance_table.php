<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->enum('status', ['present', 'absent', 'half_day', 'on_leave', 'holiday'])->default('present');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->foreignId('marked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('server_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'date']);
            $table->index('date');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
