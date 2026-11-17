<?php

// Juice Me's menu: four categories and sixteen drinks, in shillings.
// Run with: php artisan tinker database/menu.php (safe to run again: it renames in place).

use App\Models\Beverage;
use App\Models\Category;

$menu = json_decode(file_get_contents(__DIR__.'/menu.json'), true, flags: JSON_THROW_ON_ERROR);

$categories = Category::orderBy('id')->get();
if ($categories->count() !== count($menu['categories'])) {
    throw new RuntimeException('Expected '.count($menu['categories']).' categories, found '.$categories->count());
}
$ids = [];
foreach ($menu['categories'] as $i => $name) {
    $categories[$i]->update(['name' => $name]);
    $ids[$name] = $categories[$i]->id;
}

$beverages = Beverage::orderBy('id')->get();
if ($beverages->count() !== count($menu['beverages'])) {
    throw new RuntimeException('Expected '.count($menu['beverages']).' beverages, found '.$beverages->count());
}
foreach ($menu['beverages'] as $i => $drink) {
    $beverages[$i]->update([
        'name' => $drink['name'],
        'description' => $drink['description'],
        'price' => $drink['price'],
        'size' => $drink['size'],
        'category_id' => $ids[$drink['category']],
        'available' => true,
    ]);
}

echo 'Menu: '.Category::count().' categories, '.Beverage::count()." beverages\n";
