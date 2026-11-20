<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Domain;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Domain>
 */
class DomainFactory extends Factory
{
    public function definition(): array
    {
        return [
            'client_id' => Client::factory(),
            'domain_name' => fake()->unique()->domainName(),
            'registrar' => 'Registro.br',
            'registration_date' => now()->subMonths(6)->toDateString(),
            'expiration_date' => now()->addMonths(6)->toDateString(),
            'renewal_price' => 140.00,
            'status' => 'active',
            'auto_renew' => true,
            'nameservers' => "ns1.gundjatech.com\nns2.gundjatech.com",
        ];
    }
}
