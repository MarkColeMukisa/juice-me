<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\AccountAlerts;
use Database\Factories\UserFactory;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    protected static function booted(): void
    {
        // An account whose email was just proven (made verified, or verified now): the
        // administrators hear of their new customer. Not for accounts made at the console.
        static::saved(function (User $user): void {
            if (app()->runningInConsole() && ! app()->runningUnitTests()) {
                return;
            }
            if ($user->email_verified_at === null || $user->getOriginal('email_verified_at') !== null) {
                return;
            }
            if (! $user->wasRecentlyCreated && ! $user->wasChanged('email_verified_at')) {
                return;
            }
            DB::afterCommit(fn () => AccountAlerts::verified($user));
        });
    }
}
