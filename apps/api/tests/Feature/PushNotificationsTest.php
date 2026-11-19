<?php

namespace Tests\Feature;

use App\Models\Beverage;
use App\Models\Category;
use App\Models\User;
use App\Support\Push;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Nevela\Laravel\Access\Access;
use Tests\TestCase;

/**
 * Push notifications: a phone is registered when someone signs in, the administrators get a
 * push when a customer orders, and the customer gets one when the shop moves the order along.
 */
class PushNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private const ADMIN_PHONE = 'ExponentPushToken[admin-phone]';

    private const KATO_PHONE = 'ExponentPushToken[kato-phone]';

    private User $admin;

    private User $kato;

    private Beverage $mango;

    /** What Expo answers, and with which status. */
    private array $expo = [['data' => [['status' => 'ok', 'id' => 'x']]], 200];

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake([Push::URL => fn () => Http::response(...$this->expo)]);
        $this->admin = User::factory()->create(['email' => 'owner@example.com']);
        Access::grant($this->admin, 'ADMIN');
        $this->kato = User::factory()->create(['email' => 'kato@example.com', 'name' => 'Kato']);
        Access::grant($this->kato, 'CUSTOMER');
        $juices = Category::query()->create(['name' => 'Juices']);
        $this->mango = Beverage::query()->create(['name' => 'Mango Juice', 'price' => 4000, 'size' => 'medium', 'category_id' => $juices->id, 'available' => true]);

        Sanctum::actingAs($this->admin);
        $this->putJson('/api/push-tokens', ['token' => self::ADMIN_PHONE, 'platform' => 'android'])->assertOk();
        Sanctum::actingAs($this->kato);
        $this->putJson('/api/push-tokens', ['token' => self::KATO_PHONE, 'platform' => 'android'])->assertOk();
    }

    /** @return list<array<string, mixed>> every message sent to Expo */
    private function pushed(): array
    {
        return Http::recorded()->flatMap(fn (array $pair) => $pair[0]->data())->values()->all();
    }

    private function placeOrder(): string
    {
        Sanctum::actingAs($this->kato);
        $this->postJson('/api/orders', [
            'customer' => 'Kato', 'email' => 'kato@example.com', 'phone' => '0700000000', 'delivery' => 'collection',
            'items' => [['beverageId' => $this->mango->id, 'quantity' => 2]],
        ])->assertCreated();

        return (string) DB::table('orders')->value('id');
    }

    public function test_only_a_real_expo_token_is_registered_and_a_phone_follows_who_signed_in_last(): void
    {
        $this->putJson('/api/push-tokens', ['token' => 'not-a-token'])->assertUnprocessable();
        // The admin's phone, now signed in as Kato: it is Kato's.
        $this->putJson('/api/push-tokens', ['token' => self::ADMIN_PHONE])->assertOk();
        $this->assertSame((string) $this->kato->id, (string) DB::table('push_tokens')->where('token', self::ADMIN_PHONE)->value('user_id'));
        $this->assertSame(2, DB::table('push_tokens')->count());
    }

    public function test_the_admin_gets_a_push_when_a_customer_orders_and_not_the_customer(): void
    {
        $id = $this->placeOrder();

        $messages = $this->pushed();
        $this->assertCount(1, $messages);
        $this->assertSame(self::ADMIN_PHONE, $messages[0]['to']);
        $this->assertStringStartsWith('New order JM-', $messages[0]['title']);
        $this->assertSame("/dashboard/orders/{$id}", $messages[0]['data']['url']);
    }

    public function test_the_customer_gets_a_push_when_the_shop_moves_their_order_along(): void
    {
        $id = $this->placeOrder();
        $before = count($this->pushed());

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/orders/{$id}/_actions/accept", ['input' => []])->assertSuccessful();

        $messages = array_slice($this->pushed(), $before);
        $this->assertCount(1, $messages);
        $this->assertSame(self::KATO_PHONE, $messages[0]['to']);
        $this->assertMatchesRegularExpression('/^Your order JM-\d+ is now Accepted$/', $messages[0]['title']);
    }

    public function test_signing_out_stops_the_pushes_and_a_phone_expo_says_is_gone_is_forgotten(): void
    {
        Sanctum::actingAs($this->kato);
        $this->deleteJson('/api/push-tokens/'.rawurlencode(self::KATO_PHONE))->assertOk();
        $this->assertFalse(DB::table('push_tokens')->where('token', self::KATO_PHONE)->exists());

        $this->expo = [['data' => [['status' => 'error', 'details' => ['error' => 'DeviceNotRegistered']]]], 200];
        $this->placeOrder();
        $this->assertFalse(DB::table('push_tokens')->where('token', self::ADMIN_PHONE)->exists());
    }

    public function test_expo_being_down_never_fails_the_order(): void
    {
        $this->expo = ['down', 503];
        $this->placeOrder();
        $this->assertSame(1, DB::table('orders')->count());
    }
}
