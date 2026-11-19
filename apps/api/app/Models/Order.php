<?php

namespace App\Models;

use App\Support\OrderAlerts;
use App\Support\Push;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Order extends Model
{
    use HasUuids;

    protected $table = 'orders';

    // nevela:generated:start hash=5d915157aa3a
    // Deleted records go to the trash, where they can be restored for a while.
    use \Nevela\Laravel\Concerns\Trashable;
    // $record->optionLabel('status'): what its value is called, in the dashboard's words.
    use \Nevela\Laravel\Concerns\OptionLabels;
    // Numbered by Laravel when made without one: JM-0001, JM-0002.
    use \Nevela\Laravel\Concerns\Numbered;

    protected function numbered(): array
    {
        return ['number' => 'JM'];
    }
    // Each person sees their own: staff, who may edit Orders, see all of them.
    use \Nevela\Laravel\Concerns\Owned;

    protected function owner(): string
    {
        return 'email';
    }

    protected $fillable = ['number', 'customer', 'email', 'phone', 'delivery', 'details', 'status', 'total'];

    protected function casts(): array
    {
        return [
            'total' => 'float',
        ];
    }

    public function orderItems(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_id')->orderBy('id');
    }
    // nevela:generated:end

    // Your own relationships, scopes and accessors go here — outside the generated block.

    /** Called once its items are saved: the order's total is what they come to. */
    public function itemsSaved(): void
    {
        $this->update(['total' => round($this->orderItems()->get()->sum(fn (OrderItem $item) => $item->quantity * $item->price), 2)]);

        // A customer's new order, with its items and total: the administrators are emailed,
        // once it is saved for good.
        if ($this->wasRecentlyCreated && self::byCustomer()) {
            DB::afterCommit(fn () => OrderAlerts::placed($this->fresh()));
        }
    }

    /** Someone signed in who doesn't run the shop (staff may edit orders). */
    private static function byCustomer(): bool
    {
        $user = request()->user();

        return $user !== null && ! $user->can('orders.edit');
    }

    protected static function booted(): void
    {
        static::creating(function (Order $order): void {
            $user = request()->user();
            if ($user === null || $user->can('orders.edit')) {
                return; // staff, a seeder, the console: whatever they send is kept
            }
            // A customer's order is numbered and priced by Laravel. Whatever the request said
            // for these is ignored: they aren't for the person it helps to choose.
            $order->total = null;
            $order->number = \Nevela\Laravel\Support\Numbering::next($order->getTable(), 'number', 'JM');
        });

        // A customer called their order off: the administrators are emailed, so no one makes it.
        static::updated(function (Order $order): void {
            if ($order->wasChanged('status') && $order->status === 'cancelled' && self::byCustomer()) {
                DB::afterCommit(fn () => OrderAlerts::cancelled($order->fresh()));
            }
        });

        // The shop moved an order along ("Ready", "Out for delivery"): its customer gets a push,
        // in the words of the bell. Not when the customer did it themselves.
        static::updated(function (Order $order): void {
            if (! $order->wasChanged('status') || self::byCustomer() || trim((string) $order->email) === '') {
                return;
            }
            $model = config('auth.providers.users.model');
            $owner = $model::query()->where('email', $order->email)->first();
            if ($owner === null || (string) $owner->getKey() === (string) request()->user()?->getKey()) {
                return;
            }
            try {
                $status = $order->optionLabel('status');
            } catch (\Throwable) {
                $status = \Illuminate\Support\Str::headline((string) $order->status);
            }
            $title = "Your order {$order->number} is now {$status}";
            $url = "/dashboard/orders/{$order->getKey()}";
            DB::afterCommit(fn () => Push::send([$owner->getKey()], $title, 'Tap to see your order.', $url));
        });
    }
}
