<?php

namespace Tests\Feature;

use App\Models\Beverage;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Nevela\Laravel\Access\Access;
use Tests\TestCase;

/**
 * The staff home's figures (GET /api/shop-figures), and order lists that carry what is in
 * each order, for the app's order cards.
 */
class ShopFiguresTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private User $kato;

    private Beverage $mango;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();
        $this->admin = User::factory()->create(['email' => 'owner@example.com']);
        Access::grant($this->admin, 'ADMIN');
        $this->kato = User::factory()->create(['email' => 'kato@example.com', 'name' => 'Kato']);
        Access::grant($this->kato, 'CUSTOMER');
        $juices = Category::query()->create(['name' => 'Juices']);
        $this->mango = Beverage::query()->create(['name' => 'Mango Juice', 'price' => 4000, 'size' => 'medium', 'category_id' => $juices->id, 'available' => true]);
    }

    private function placeOrder(int $quantity = 2): string
    {
        Sanctum::actingAs($this->kato);
        $this->postJson('/api/orders', [
            'customer' => 'Kato', 'email' => 'kato@example.com', 'phone' => '0700000000', 'delivery' => 'collection',
            'items' => [['beverageId' => $this->mango->id, 'quantity' => $quantity]],
        ])->assertCreated();

        return (string) DB::table('orders')->latest('created_at')->value('id');
    }

    public function test_staff_see_todays_orders_whats_pending_and_sales_without_the_cancelled(): void
    {
        // 23:30 in Kampala yesterday is 20:30 UTC: yesterday's, not today's.
        Carbon::setTestNow(Carbon::parse('2026-11-20 23:30', 'Africa/Kampala'));
        $this->placeOrder(1);
        Carbon::setTestNow(Carbon::parse('2026-11-21 09:00', 'Africa/Kampala'));
        $this->placeOrder(2);
        Carbon::setTestNow(Carbon::parse('2026-11-21 09:05', 'Africa/Kampala'));
        $cancelled = $this->placeOrder(3);
        DB::table('orders')->where('id', $cancelled)->update(['status' => 'cancelled']);

        Sanctum::actingAs($this->admin);
        $this->getJson('/api/shop-figures')->assertOk()->assertJson([
            'today' => ['orders' => 2, 'sameTimeLastWeek' => 0],
            'pending' => 2,
            'sales' => ['total' => 12000, 'week' => 12000, 'lastWeek' => 0],
        ]);
        Carbon::setTestNow();
    }

    public function test_a_customer_cant_see_the_shops_figures(): void
    {
        Sanctum::actingAs($this->kato);
        $this->getJson('/api/shop-figures')->assertForbidden();
    }

    public function test_an_order_list_carries_what_is_in_each_order(): void
    {
        $this->placeOrder(2);
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/orders')->assertOk()
            ->assertJsonPath('data.0.items.0.beverageId', $this->mango->id)
            ->assertJsonPath('data.0.items.0.quantity', 2);
    }
}
