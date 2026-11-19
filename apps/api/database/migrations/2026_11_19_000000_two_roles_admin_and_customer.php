<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Two roles, and only two: ADMIN, who runs the shop, and CUSTOMER, who buys from it.
 *
 * Nevela starts every app with ADMIN, EDITOR and USER. Here CUSTOMER is made (or brought
 * up to date) with what a customer does, everyone who isn't an administrator becomes a
 * customer, and every other role is removed. Signing up gives CUSTOMER
 * (NEVELA_DEFAULT_ROLE=CUSTOMER), so a new customer can order straight away.
 *
 * A customer sees only their own orders: Orders are owned by email (Nevela's Owned), and
 * only someone who may edit orders sees everyone's.
 */
return new class extends Migration
{
    private const CUSTOMER_GRANTS = [
        'beverages.view',
        'categories.view',
        'banners.view',
        'posts.view',
        'orders.view',
        'orders.create',
        'orders.cancel',
    ];

    public function up(): void
    {
        $now = now();
        $customer = DB::table('nevela_roles')->whereRaw('lower(name) = ?', ['customer'])->first();
        $values = [
            'name' => 'CUSTOMER',
            'description' => 'Buys from the shop: sees the menu, places orders, follows and cancels their own.',
            'grants' => json_encode(self::CUSTOMER_GRANTS),
            // Built in: it can be edited, and not renamed or deleted, like ADMIN.
            'is_system' => true,
            'updated_at' => $now,
        ];
        if ($customer === null) {
            $customerId = (string) Str::uuid();
            DB::table('nevela_roles')->insert($values + ['id' => $customerId, 'created_at' => $now]);
        } else {
            $customerId = $customer->id;
            DB::table('nevela_roles')->where('id', $customerId)->update($values);
        }

        $adminId = DB::table('nevela_roles')->where('name', 'ADMIN')->value('id');
        $admins = $adminId === null ? collect() : DB::table('nevela_role_user')->where('role_id', $adminId)->pluck('user_id');

        // Everyone who isn't an administrator is a customer.
        $model = config('auth.providers.users.model');
        $user = is_string($model) && class_exists($model) ? new $model : null;
        $users = DB::table($user?->getTable() ?? 'users')->pluck($user?->getKeyName() ?? 'id')->map(fn ($id) => (string) $id);
        $rows = $users->diff($admins->map(fn ($id) => (string) $id))->map(fn ($id) => ['role_id' => $customerId, 'user_id' => $id])->values()->all();
        foreach (array_chunk($rows, 500) as $chunk) {
            DB::table('nevela_role_user')->insertOrIgnore($chunk);
        }

        // Then nothing but the two. (Their links to people go with them.)
        $others = DB::table('nevela_roles')->whereNotIn('id', array_filter([$adminId, $customerId]))->pluck('id');
        DB::table('nevela_role_user')->whereIn('role_id', $others)->delete();
        DB::table('nevela_roles')->whereIn('id', $others)->delete();
    }

    /** The roles that were removed, and who held them, aren't known any more: nothing to undo. */
    public function down(): void {}
};
