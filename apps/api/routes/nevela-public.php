<?php

use Illuminate\Support\Facades\Route;

// What anyone can call without signing in: {prefix}/public/… (default: /api/public).
// Written from each resource's "public" section by `php artisan nevela:generate`.
// A resource without one has no route here, and so nothing of it is open.
// nevela:generated:start hash=f9578caf4585
Route::get('posts', [\Nevela\Laravel\Http\PublicController::class, 'index'])->defaults('resource', 'Post')->middleware(['nevela.throttle:60,1,posts.read:'])->name('posts.index');
Route::get('posts/{id}', [\Nevela\Laravel\Http\PublicController::class, 'show'])->defaults('resource', 'Post')->middleware(['nevela.throttle:60,1,posts.read:'])->name('posts.show');
// nevela:generated:end
