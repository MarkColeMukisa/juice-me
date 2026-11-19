<?php

namespace Tests\Feature;

use App\Models\Beverage;
use App\Models\Category;
use App\Models\Like;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Nevela\Laravel\Access\Access;
use Nevela\Laravel\Models\Role;
use Tests\TestCase;

/** The drinks a customer likes: their own, once each, and nothing in the bell or the trash. */
class LikesTest extends TestCase
{
    use RefreshDatabase;

    private User $amara;

    private User $bo;

    private Beverage $mango;

    protected function setUp(): void
    {
        parent::setUp();
        // CUSTOMER is one of the app's two roles, made by its migration.
        $this->assertNotNull(Role::query()->where('name', 'CUSTOMER')->first());
        $this->amara = User::factory()->create(['email' => 'amara@example.com']);
        Access::grant($this->amara, 'CUSTOMER');
        $this->bo = User::factory()->create(['email' => 'bo@example.com']);
        Access::grant($this->bo, 'CUSTOMER');
        $juices = Category::query()->create(['name' => 'Juices']);
        $this->mango = Beverage::query()->create(['name' => 'Mango Juice', 'price' => 4000, 'size' => 'medium', 'category_id' => $juices->id, 'available' => true]);
    }

    public function test_a_customer_likes_a_drink_once_and_sees_only_their_own(): void
    {
        Sanctum::actingAs($this->amara);
        $this->putJson("/api/likes/{$this->mango->id}")->assertOk()->assertJson(['liked' => true]);
        // A double tap, or a retry: still one.
        $this->putJson("/api/likes/{$this->mango->id}")->assertOk();
        $this->assertSame(1, Like::query()->count());
        $this->getJson('/api/likes')->assertOk()->assertExactJson(['data' => [$this->mango->id]]);

        Sanctum::actingAs($this->bo);
        $this->getJson('/api/likes')->assertOk()->assertExactJson(['data' => []]);
        // Bo can't take Amara's like away: his unlike is of his own, which isn't there.
        $this->deleteJson("/api/likes/{$this->mango->id}")->assertOk();
        $this->assertSame(1, Like::query()->count());
    }

    public function test_unliking_removes_it_for_good_and_tells_no_one(): void
    {
        Sanctum::actingAs($this->amara);
        $this->putJson("/api/likes/{$this->mango->id}")->assertOk();
        $this->deleteJson("/api/likes/{$this->mango->id}")->assertOk()->assertJson(['liked' => false]);
        $this->assertSame(0, Like::query()->count());
        // Liked again after unliking: nothing in the way.
        $this->putJson("/api/likes/{$this->mango->id}")->assertOk();
        $this->assertSame(1, Like::query()->count());
        $this->assertDatabaseCount('nevela_notifications', 0);
    }

    public function test_only_a_drink_that_exists_and_only_someone_signed_in(): void
    {
        $this->getJson('/api/likes')->assertUnauthorized();
        Sanctum::actingAs($this->amara);
        $this->putJson('/api/likes/01a1eb17-0000-0000-0000-000000000000')->assertNotFound();
    }
}
