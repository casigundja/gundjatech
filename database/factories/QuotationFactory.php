<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Quotation>
 */
class QuotationFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 2500, 15000);

        return [
            'quotation_number' => 'ORC-'.date('Y').'-'.strtoupper(Str::random(5)),
            'client_id' => Client::factory(),
            'user_id' => User::factory()->state(['role' => 'manager']),
            'title' => 'Proposta '.fake()->words(3, true),
            'subtotal' => $subtotal,
            'discount' => 0,
            'total' => $subtotal,
            'status' => 'sent',
            'valid_until' => now()->addDays(15)->toDateString(),
            'notes' => fake()->sentence(),
        ];
    }
}
