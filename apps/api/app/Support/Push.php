<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Push notifications to people's phones, through Expo's push service (which hands them to
 * Firebase for Android and to Apple for iPhones).
 *
 * A push never gets in the way of the work that caused it: Expo is given a few seconds, and
 * a failure is reported and passed over. A phone Expo says is gone (the app was removed, or
 * its notifications were reset) is forgotten, so it isn't tried again.
 */
final class Push
{
    public const URL = 'https://exp.host/--/api/v2/push/send';

    /** Expo takes at most this many messages in one request. */
    private const BATCH = 100;

    /**
     * Tell these people (user ids), on every phone they're signed in on.
     *
     * @param  iterable<int|string>  $userIds
     * @param  string|null  $url  Where a tap leads in the app: "/dashboard/orders/{id}"
     */
    public static function send(iterable $userIds, string $title, ?string $body = null, ?string $url = null): void
    {
        try {
            $ids = collect($userIds)->filter(fn ($id) => $id !== null && $id !== '')->unique()->values();
            if ($ids->isEmpty()) {
                return;
            }
            $tokens = DB::table('push_tokens')->whereIn('user_id', $ids)->pluck('token')->all();
            foreach (array_chunk($tokens, self::BATCH) as $batch) {
                self::deliver($batch, $title, $body, $url);
            }
        } catch (Throwable $e) {
            report($e);
        }
    }

    /** @param list<string> $tokens */
    private static function deliver(array $tokens, string $title, ?string $body, ?string $url): void
    {
        $messages = array_map(fn (string $token) => array_filter([
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'sound' => 'default',
            'channelId' => 'default',
            'priority' => 'high',
            'data' => $url === null ? null : ['url' => $url],
        ], fn ($value) => $value !== null), $tokens);

        try {
            $answer = Http::timeout(5)->acceptJson()->asJson()->post(self::URL, $messages);
        } catch (Throwable $e) {
            report($e);

            return;
        }
        if (! $answer->successful()) {
            report(new \RuntimeException("Expo push failed ({$answer->status()}): ".substr($answer->body(), 0, 300)));

            return;
        }
        // One ticket per message, in the same order.
        $gone = [];
        foreach ((array) $answer->json('data', []) as $i => $ticket) {
            if (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered' && isset($tokens[$i])) {
                $gone[] = $tokens[$i];
            }
        }
        if ($gone !== []) {
            DB::table('push_tokens')->whereIn('token', $gone)->delete();
        }
    }
}
