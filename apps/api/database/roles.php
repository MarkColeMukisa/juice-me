<?php

// The tutorial's two roles (step 6), as the Roles screen would save them.
use Nevela\Laravel\Models\Role;

Role::updateOrCreate(['name' => 'CUSTOMER'], ['description' => 'Signs up from the phone, orders drinks and follows them.', 'is_system' => false, 'grants' => [
    'beverages.view', 'categories.view', 'orders.view', 'orders.create',
]]);
Role::updateOrCreate(['name' => 'STAFF'], ['description' => 'Runs the bar: the menu and the orders.', 'is_system' => false, 'grants' => [
    'beverages.view', 'beverages.create', 'beverages.edit', 'beverages.delete',
    'categories.view', 'categories.create', 'categories.edit',
    'orders.view', 'orders.edit',
]]);
foreach (Role::orderBy('name')->get() as $role) echo $role->name, ': ', implode(', ', $role->grants), PHP_EOL;
