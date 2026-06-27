<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class AttendanceFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'date' => fake()->unique()->date(),
            'status' => 'present',
            'check_in' => '09:00:00',
            'check_out' => '18:00:00',
        ];
    }
}
