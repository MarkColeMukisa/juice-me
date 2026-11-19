<?php

namespace App\Support;

use App\Models\User;
use Nevela\Laravel\Auth\AuthMail;
use Throwable;

/**
 * The administrators are emailed about each new account, once its email is proven: by the
 * code sent at sign-up, an emailed sign-in code, or Google and the like. An address nobody
 * verified never gets this far, so it doesn't fill their inbox.
 */
final class AccountAlerts
{
    public static function verified(User $user): void
    {
        $lines = [
            trim((string) $user->name) !== '' ? "{$user->name} ({$user->email}) just verified their email and can now sign in and order." : "{$user->email} just verified their email and can now sign in and order.",
            'Signed up '.($user->created_at?->timezone(config('app.timezone'))->format('j M Y, H:i') ?? 'just now').'.',
        ];
        foreach (OrderAlerts::admins() as $admin) {
            if ($admin->email === null || (string) $admin->id === (string) $user->getKey()) {
                continue;
            }
            try {
                AuthMail::send($admin->email, 'New customer: '.(trim((string) $user->name) ?: $user->email), $lines);
            } catch (Throwable $e) {
                report($e);
            }
        }
    }
}
