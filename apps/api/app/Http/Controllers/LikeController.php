<?php

namespace App\Http\Controllers;

use App\Models\Beverage;
use App\Models\Like;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The drinks the signed-in person likes: GET /api/likes, PUT and DELETE /api/likes/{beverage}.
 * Each person only ever reads and changes their own. Liking twice, or unliking what isn't
 * liked, does nothing, so a double tap or a retry on a bad connection is harmless.
 */
class LikeController
{
    /** The ids of the drinks they like, the newest first. */
    public function index(Request $request): JsonResponse
    {
        $this->mayBrowse($request);

        return response()->json([
            'data' => Like::query()
                ->where('user_id', $request->user()->getKey())
                ->latest('id')
                ->pluck('beverage_id'),
        ]);
    }

    public function store(Request $request, string $beverage): JsonResponse
    {
        $this->mayBrowse($request);
        abort_unless(Beverage::query()->whereKey($beverage)->exists(), 404, 'There is no such drink.');
        Like::query()->firstOrCreate(['user_id' => $request->user()->getKey(), 'beverage_id' => $beverage]);

        return response()->json(['liked' => true]);
    }

    public function destroy(Request $request, string $beverage): JsonResponse
    {
        $this->mayBrowse($request);
        Like::query()->where('user_id', $request->user()->getKey())->where('beverage_id', $beverage)->delete();

        return response()->json(['liked' => false]);
    }

    /** Liking a drink needs no more than seeing the menu. */
    private function mayBrowse(Request $request): void
    {
        abort_unless($request->user()->can('beverages.view'), 403, "You can't see the menu.");
    }
}
