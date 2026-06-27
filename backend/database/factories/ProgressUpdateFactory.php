<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProgressUpdateFactory extends Factory
{
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'user_id' => User::factory(),
            'text' => fake()->paragraph(),
            'percentage' => fake()->numberBetween(10, 100),
            'progress_date' => now()->toDateString(),
        ];
    }
}
