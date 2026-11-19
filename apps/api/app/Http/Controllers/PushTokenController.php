<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The phone the app runs on, for push notifications: PUT /api/push-tokens when someone signs
 * in, DELETE /api/push-tokens/{token} when they sign out.
 *
 * A phone belongs to whoever signed in on it last: a second person signing in on the same
 * phone takes it over, so the first person's pushes stop going there.
 */
class PushTokenController
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:255', 'regex:/^Expo(nent)?PushToken\[[^\]]+\]$/'],
            'platform' => ['nullable', 'string', 'in:android,ios'],
        ]);
        $now = now();
        DB::table('push_tokens')->upsert(
            [['token' => $data['token'], 'user_id' => $request->user()->getKey(), 'platform' => $data['platform'] ?? null, 'created_at' => $now, 'updated_at' => $now]],
            ['token'],
            ['user_id', 'platform', 'updated_at'],
        );

        return response()->json(['registered' => true]);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        DB::table('push_tokens')->where('token', $token)->where('user_id', $request->user()->getKey())->delete();

        return response()->json(['registered' => false]);
    }
}
