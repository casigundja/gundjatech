<?php

namespace Database\Factories;

use App\Models\Service;
use App\Models\ServiceCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);

        return [
            'category_id' => ServiceCategory::factory(),
            'name' => ucfirst($name),
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(10, 999),
            'short_description' => fake()->sentence(),
            'full_description' => fake()->paragraph(),
            'icon' => 'layout',
            'base_price' => fake()->randomFloat(2, 1000, 12000),
            'billing_type' => fake()->randomElement(['one_time', 'monthly', 'yearly']),
            'estimated_days' => fake()->numberBetween(5, 30),
            'features' => ['Design exclusivo', 'Alta performance', 'SEO técnico'],
            'is_featured' => false,
            'is_active' => true,
        ];
    }
}
