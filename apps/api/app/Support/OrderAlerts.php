<?php

namespace App\Support;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Support\Facades\DB;
use Nevela\Laravel\Auth\AuthMail;
use Throwable;

/**
 * Emails and push notifications to the people who run the shop: every administrator hears
 * when a customer places an order, and when a customer cancels one. (Nevela's bell tells
 * them in the app too.)
 *
 * Sent after the order is saved for good, and never in the way of it: an email that can't
 * be sent is reported, and the customer's order stands.
 */
final class OrderAlerts
{
    public static function placed(Order $order): void
    {
        $order->loadMissing('orderItems.beverage');
        $lines = [
            self::who($order),
            ...$order->orderItems->map(fn (OrderItem $item) => sprintf(
                '%d × %s: %s',
                $item->quantity,
                $item->beverage?->name ?? 'A drink no longer on the menu',
                self::money($item->quantity * $item->price),
            ))->all(),
            'Total: '.self::money((float) $order->total),
        ];
        if (trim((string) $order->details) !== '') {
            $lines[] = 'Note from the customer: '.trim((string) $order->details);
        }

        self::send("New order {$order->number}: ".self::money((float) $order->total), $lines, $order);
    }

    public static function cancelled(Order $order): void
    {
        self::send("Order {$order->number} was cancelled by the customer", [
            self::who($order),
            'Total was '.self::money((float) $order->total).'. Nothing more needs doing for it.',
        ], $order);
    }

    /** @param list<string> $lines */
    private static function send(string $subject, array $lines, Order $order): void
    {
        $admins = self::admins();
        foreach ($admins->pluck('email')->filter() as $email) {
            try {
                AuthMail::send($email, $subject, $lines);
            } catch (Throwable $e) {
                report($e);
            }
        }
        // On their phones too: the first line (who, and how) under the subject.
        Push::send($admins->pluck('id'), $subject, $lines[0] ?? null, "/dashboard/orders/{$order->getKey()}");
    }

    private static function who(Order $order): string
    {
        $how = $order->delivery === 'delivery' ? 'for delivery' : 'to collect';
        $phone = trim((string) $order->phone) !== '' ? ", {$order->phone}" : '';

        return trim("{$order->customer} ({$order->email}{$phone}), {$how}.");
    }

    private static function money(float $amount): string
    {
        return config('nevela.currency', 'UGX').' '.number_format($amount, 0);
    }

    /** The administrators: their ids and emails. */
    private static function admins(): \Illuminate\Support\Collection
    {
        $model = config('auth.providers.users.model');
        $user = new $model;

        return DB::table($user->getTable())
            ->join('nevela_role_user', 'nevela_role_user.user_id', '=', DB::raw($user->getTable().'.'.$user->getKeyName()))
            ->join('nevela_roles', 'nevela_roles.id', '=', 'nevela_role_user.role_id')
            ->where('nevela_roles.name', 'ADMIN')
            ->distinct()
            ->get([$user->getTable().'.'.$user->getKeyName().' as id', $user->getTable().'.email']);
    }
}
