<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

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
    }
}
