<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProjectFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'client' => fake()->company(),
            'department_id' => Department::factory(),
            'status' => 'assigned',
            'priority' => 'medium',
            'created_by' => User::factory(),
            'assigned_to' => null,
            'sub_assigned_to' => null,
            'deadline' => now()->addDays(7),
            'description' => fake()->paragraph(),
        ];
    }
}
