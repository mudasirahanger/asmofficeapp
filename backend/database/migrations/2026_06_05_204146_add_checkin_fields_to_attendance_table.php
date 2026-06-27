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
        Schema::table('attendance', function (Blueprint $table) {
            $table->dateTime('check_in_at')->nullable();
            $table->dateTime('check_out_at')->nullable();
            $table->decimal('check_in_latitude', 10, 7)->nullable();
            $table->decimal('check_in_longitude', 10, 7)->nullable();
            $table->decimal('check_out_latitude', 10, 7)->nullable();
            $table->decimal('check_out_longitude', 10, 7)->nullable();
            $table->decimal('check_in_location_accuracy', 8, 2)->nullable();
            $table->decimal('check_out_location_accuracy', 8, 2)->nullable();
            $table->string('check_in_platform')->nullable();
            $table->string('check_out_platform')->nullable();
            $table->string('check_in_device')->nullable();
            $table->string('check_out_device')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->dropColumn([
                'check_in_at', 'check_out_at',
                'check_in_latitude', 'check_in_longitude',
                'check_out_latitude', 'check_out_longitude',
                'check_in_location_accuracy', 'check_out_location_accuracy',
                'check_in_platform', 'check_out_platform',
                'check_in_device', 'check_out_device',
            ]);
        });
    }
};
