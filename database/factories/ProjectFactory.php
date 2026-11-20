<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Project;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => 'PRJ-'.date('Y').'-'.strtoupper(Str::random(5)),
            'client_id' => Client::factory(),
            'service_id' => Service::factory(),
            'manager_id' => User::factory()->state(['role' => 'manager']),
            'name' => 'Projeto '.fake()->words(3, true),
            'description' => fake()->paragraph(),
            'status' => 'in_progress',
            'progress_percentage' => fake()->numberBetween(10, 90),
            'start_date' => now()->toDateString(),
            'deadline' => now()->addDays(45)->toDateString(),
            'budget' => fake()->randomFloat(2, 3500, 20000),
        ];
    }
}
