<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * The shop's day at a glance, for the staff home in the app: GET /api/shop-figures.
 *
 * - Today's orders, counted from midnight in Kampala, against the same day last week up to
 *   the same time (a fair comparison at 10 am, not a whole day against a morning).
 * - Orders waiting to be accepted.
 * - Sales: what orders came to, cancelled ones left out. This week (the last seven days,
 *   today included) against the seven before.
 *
 * Only for staff, who may edit orders and so see all of them.
 */
class ShopFiguresController
{
    public const ZONE = 'Africa/Kampala';

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('orders.edit'), 403, 'Only staff see the shop\'s figures.');

        $now = Carbon::now(self::ZONE);
        $midnight = $now->copy()->startOfDay();
        $weekStart = $midnight->copy()->subDays(6);
        $orders = fn () => Order::query()->withoutEagerLoads()->reorder();
        $sold = fn () => $orders()->where('status', '!=', 'cancelled');
        // Stored in UTC: each edge is turned into it before comparing.
        $utc = fn (Carbon $at) => $at->copy()->utc();

        return response()->json([
            'today' => [
                'orders' => $orders()->where('created_at', '>=', $utc($midnight))->count(),
                'sameTimeLastWeek' => $orders()->whereBetween('created_at', [$utc($midnight->copy()->subWeek()), $utc($now->copy()->subWeek())])->count(),
            ],
            'pending' => $orders()->where('status', 'pending')->count(),
            'sales' => [
                'total' => (float) $sold()->sum('total'),
                'week' => (float) $sold()->where('created_at', '>=', $utc($weekStart))->sum('total'),
                'lastWeek' => (float) $sold()->whereBetween('created_at', [$utc($weekStart->copy()->subWeek()), $utc($weekStart)])->sum('total'),
            ],
            'currency' => config('nevela.currency', 'UGX'),
        ]);
    }
}
