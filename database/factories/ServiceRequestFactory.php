<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ServiceRequest>
 */
class ServiceRequestFactory extends Factory
{
    public function definition(): array
    {
        return [
            'protocol' => 'GNDJ-'.date('Ymd').'-'.strtoupper(Str::random(4)),
            'client_id' => Client::factory(),
            'user_id' => User::factory()->state(['role' => 'client']),
            'service_id' => Service::factory(),
            'name' => fake()->name(),
            'company' => fake()->company(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'service_title' => fake()->sentence(4),
            'description' => fake()->paragraph(),
            'estimated_budget' => fake()->randomFloat(2, 2000, 25000),
            'desired_deadline' => now()->addDays(30)->toDateString(),
            'status' => 'new',
        ];
    }
}
