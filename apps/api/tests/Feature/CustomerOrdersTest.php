<?php

namespace Tests\Feature;

use App\Models\Beverage;
use App\Models\Category;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Nevela\Laravel\Access\Access;
use Nevela\Laravel\Auth\AuthMail;
use Tests\TestCase;

/**
 * Two roles: a new account is a CUSTOMER and can order at once, and the administrators are
 * emailed when a customer places an order or cancels one.
 */
class CustomerOrdersTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Beverage $mango;

    protected function setUp(): void
    {
        parent::setUp();
        config(['nevela.auth.default_role' => 'CUSTOMER', 'nevela.auth.require_email_verification' => false]);
        AuthMail::$outbox = [];
        $this->admin = User::factory()->create(['email' => 'owner@example.com']);
        Access::grant($this->admin, 'ADMIN');
        $juices = Category::query()->create(['name' => 'Juices']);
        $this->mango = Beverage::query()->create(['name' => 'Mango Juice', 'price' => 4000, 'size' => 'medium', 'category_id' => $juices->id, 'available' => true]);
    }

    public function test_there_are_only_two_roles(): void
    {
        $this->assertEqualsCanonicalizing(['ADMIN', 'CUSTOMER'], DB::table('nevela_roles')->pluck('name')->all());
    }

    public function test_a_new_account_is_a_customer_who_orders_and_the_admin_is_emailed(): void
    {
        $this->postJson('/api/auth/register', ['name' => 'Kato Customer', 'email' => 'kato@example.com', 'password' => 'a-long-password-1', 'deviceName' => 'test'])->assertCreated();
        $kato = User::query()->where('email', 'kato@example.com')->firstOrFail();
        $this->assertTrue($kato->can('orders.create'));
        $this->assertFalse($kato->can('orders.edit'));

        AuthMail::$outbox = [];
        Sanctum::actingAs($kato);
        $placed = $this->postJson('/api/orders', [
            'customer' => 'Kato Customer',
            'phone' => '0700000000',
            'delivery' => 'collection',
            'items' => [['beverageId' => $this->mango->id, 'quantity' => 2]],
        ])->assertCreated();

        $mail = collect(AuthMail::$outbox)->firstWhere('email', 'owner@example.com');
        $this->assertNotNull($mail, 'The administrator was emailed');
        $this->assertStringStartsWith('New order JM-', $mail['subject']);
        $this->assertContains('2 × Mango Juice: '.config('nevela.currency', 'UGX').' 8,000', $mail['lines']);

        // Cancelling it: the administrator hears of that too.
        AuthMail::$outbox = [];
        $id = $placed->json('data.id') ?? $placed->json('id') ?? Order::query()->value('id');
        $this->postJson("/api/orders/{$id}/_actions/cancel", ['input' => []])->assertSuccessful();
        $cancelled = collect(AuthMail::$outbox)->firstWhere('email', 'owner@example.com');
        $this->assertNotNull($cancelled, 'The administrator was emailed about the cancellation');
        $this->assertStringContainsString('was cancelled by the customer', $cancelled['subject']);
    }

    public function test_staff_orders_send_no_email(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/orders', [
            'customer' => 'Walk-in', 'email' => 'walkin@example.com', 'delivery' => 'collection',
            'items' => [['beverageId' => $this->mango->id, 'quantity' => 1]],
        ])->assertCreated();
        $this->assertSame([], AuthMail::$outbox);
    }
}
