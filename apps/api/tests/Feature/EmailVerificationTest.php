<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Nevela\Laravel\Access\Access;
use Nevela\Laravel\Auth\AuthMail;
use Tests\TestCase;

/**
 * A new account proves its email before it can sign in, and only then are the
 * administrators emailed about their new customer.
 */
class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['nevela.auth.default_role' => 'CUSTOMER']);
        $admin = User::factory()->create(['email' => 'owner@example.com']);
        Access::grant($admin, 'ADMIN');
        AuthMail::$outbox = [];
    }

    private function codeFor(string $email): string
    {
        $mail = collect(AuthMail::$outbox)->last(fn (array $mail) => $mail['email'] === $email);
        $this->assertNotNull($mail, "A code was emailed to {$email}");
        preg_match('/\b(\d{6})\b/', implode(' ', $mail['lines']), $match);

        return $match[1];
    }

    public function test_signing_up_needs_the_emailed_code_and_then_the_admin_hears_of_the_new_customer(): void
    {
        $this->postJson('/api/auth/register', ['name' => 'Kato', 'email' => 'kato@example.com', 'password' => 'a-long-password-1', 'deviceName' => 'test'])
            ->assertCreated()->assertJson(['verify' => true])->assertJsonMissingPath('token');

        // Not yet: no password sign-in, and the admin hasn't been told about an unproven address.
        $this->postJson('/api/auth/token', ['email' => 'kato@example.com', 'password' => 'a-long-password-1', 'deviceName' => 'test'])
            ->assertForbidden()->assertJson(['code' => 'EMAIL_NOT_VERIFIED']);
        $this->assertNull(collect(AuthMail::$outbox)->firstWhere('email', 'owner@example.com'));

        $this->postJson('/api/auth/email/verify', ['email' => 'kato@example.com', 'code' => $this->codeFor('kato@example.com'), 'deviceName' => 'test'])->assertSuccessful();

        $told = collect(AuthMail::$outbox)->firstWhere('email', 'owner@example.com');
        $this->assertNotNull($told, 'The administrator was emailed');
        $this->assertSame('New customer: Kato', $told['subject']);
        $this->postJson('/api/auth/token', ['email' => 'kato@example.com', 'password' => 'a-long-password-1', 'deviceName' => 'test'])->assertSuccessful();
    }

    public function test_the_admin_is_told_only_once(): void
    {
        $user = User::factory()->unverified()->create(['email' => 'amara@example.com', 'name' => 'Amara']);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->forceFill(['name' => 'Amara N.'])->save();

        $this->assertCount(1, collect(AuthMail::$outbox)->where('email', 'owner@example.com'));
    }
}
