<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state(['role' => 'client']),
            'name' => fake()->name(),
            'company_name' => fake()->company(),
            'email' => fake()->unique()->companyEmail(),
            'phone' => fake()->phoneNumber(),
            'document' => fake()->numerify('##.###.###/0001-##'),
            'address' => fake()->streetAddress(),
            'city' => fake()->city(),
            'state' => 'SP',
            'postal_code' => fake()->postcode(),
            'notes' => fake()->sentence(),
            'status' => 'active',
        ];
    }
}
