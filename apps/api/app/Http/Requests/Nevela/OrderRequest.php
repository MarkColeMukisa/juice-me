<?php

namespace App\Http\Requests\Nevela;

use App\Models\Order;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Nevela\Laravel\Http\ResourceRequest;

/**
 * Validation for creating (POST), replacing (PUT) and patching (PATCH) a Order.
 * PATCH makes every rule "sometimes"; PUT clears optional fields left out.
 */
class OrderRequest extends ResourceRequest
{
    public function authorize(): bool
    {
        $order = $this->route('order');

        return $order instanceof Order
            ? Gate::allows('update', $order)
            : Gate::allows('create', Order::class);
    }

    // nevela:generated:start hash=3086f80ede9a
    public function rules(): array
    {
        $order = $this->route('order');

        return [
            'number' => ['nullable', 'string', 'max:255', Rule::unique('orders', 'number')->ignore($order)],
            'customer' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:32', new \Nevela\Laravel\Rules\Phone],
            'delivery' => ['sometimes', 'required', Rule::in(['collection', 'delivery'])],
            'details' => ['nullable', 'string', 'max:65535'],
            'status' => ['sometimes', 'required', Rule::in(['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'])],
            'total' => ['nullable', 'numeric'],
        ];
    }

    protected function columns(): array
    {
        return ['number' => 'number', 'customer' => 'customer', 'email' => 'email', 'phone' => 'phone', 'delivery' => 'delivery', 'details' => 'details', 'status' => 'status', 'total' => 'total'];
    }

    /** Phone fields, and the country each is held to, if any. A number is put in the form it is kept in, +256772123456, before it is checked. */
    protected function phones(): array
    {
        return ['phone' => NULL];
    }

    /** Fields kept in one form, by their format: an email in small letters, a colour as #aabbcc, a domain without its https://. Put in it before they are checked. */
    protected function kept(): array
    {
        return ['email' => 'email'];
    }

    /** What a field is when a create leaves it out. */
    protected function defaults(): array
    {
        return ['delivery' => 'collection', 'status' => 'pending'];
    }

    /** Its lines, sent as "items": order items, checked by their own rules and saved with it. */
    protected function lineItems(): ?array
    {
        return ['request' => OrderItemRequest::class, 'model' => \App\Models\OrderItem::class, 'field' => 'orderId', 'column' => 'order_id'];
    }
    // nevela:generated:end
}
