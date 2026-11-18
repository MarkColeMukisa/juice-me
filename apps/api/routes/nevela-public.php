<?php

use Illuminate\Support\Facades\Route;

// What anyone can call without signing in: {prefix}/public/… (default: /api/public).
// Written from each resource's "public" section by `php artisan nevela:generate`.
// A resource without one has no route here, and so nothing of it is open.
// nevela:generated:start hash=ec6449382c71
Route::get('banners', [\Nevela\Laravel\Http\PublicController::class, 'index'])->defaults('resource', 'Banner')->middleware(['nevela.throttle:600,1,banners.read:'])->name('banners.index');
Route::get('banners/{id}', [\Nevela\Laravel\Http\PublicController::class, 'show'])->defaults('resource', 'Banner')->middleware(['nevela.throttle:600,1,banners.read:'])->name('banners.show');
Route::get('beverages', [\Nevela\Laravel\Http\PublicController::class, 'index'])->defaults('resource', 'Beverage')->middleware(['nevela.throttle:600,1,beverages.read:'])->name('beverages.index');
Route::get('beverages/{id}', [\Nevela\Laravel\Http\PublicController::class, 'show'])->defaults('resource', 'Beverage')->middleware(['nevela.throttle:600,1,beverages.read:'])->name('beverages.show');
Route::get('categories', [\Nevela\Laravel\Http\PublicController::class, 'index'])->defaults('resource', 'Category')->middleware(['nevela.throttle:600,1,categories.read:'])->name('categories.index');
Route::get('categories/{id}', [\Nevela\Laravel\Http\PublicController::class, 'show'])->defaults('resource', 'Category')->middleware(['nevela.throttle:600,1,categories.read:'])->name('categories.show');
Route::get('posts', [\Nevela\Laravel\Http\PublicController::class, 'index'])->defaults('resource', 'Post')->middleware(['nevela.throttle:60,1,posts.read:'])->name('posts.index');
Route::get('posts/{id}', [\Nevela\Laravel\Http\PublicController::class, 'show'])->defaults('resource', 'Post')->middleware(['nevela.throttle:60,1,posts.read:'])->name('posts.show');
// nevela:generated:end
