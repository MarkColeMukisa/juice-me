<?php

use Illuminate\Support\Facades\Route;

// Loaded by Nevela under the prefix and middleware in config/nevela.php
// (default: /api, auth:sanctum). Add your own routes below the generated block.
// nevela:generated:start hash=59de6a5b897d
Route::get('beverages/_stats', [\App\Http\Controllers\Api\BeverageController::class, 'stats'])->name('beverages.stats');
Route::get('beverages/_insights', [\App\Http\Controllers\Api\BeverageController::class, 'insights'])->name('beverages.insights');
Route::post('beverages/_bulk', [\App\Http\Controllers\Api\BeverageController::class, 'bulk'])->name('beverages.bulk');
Route::apiResource('beverages', \App\Http\Controllers\Api\BeverageController::class);
Route::get('categories/_stats', [\App\Http\Controllers\Api\CategoryController::class, 'stats'])->name('categories.stats');
Route::get('categories/_insights', [\App\Http\Controllers\Api\CategoryController::class, 'insights'])->name('categories.insights');
Route::post('categories/_bulk', [\App\Http\Controllers\Api\CategoryController::class, 'bulk'])->name('categories.bulk');
Route::apiResource('categories', \App\Http\Controllers\Api\CategoryController::class);
Route::get('order-items/_stats', [\App\Http\Controllers\Api\OrderItemController::class, 'stats'])->name('order-items.stats');
Route::get('order-items/_insights', [\App\Http\Controllers\Api\OrderItemController::class, 'insights'])->name('order-items.insights');
Route::post('order-items/_bulk', [\App\Http\Controllers\Api\OrderItemController::class, 'bulk'])->name('order-items.bulk');
Route::apiResource('order-items', \App\Http\Controllers\Api\OrderItemController::class);
Route::get('orders/_stats', [\App\Http\Controllers\Api\OrderController::class, 'stats'])->name('orders.stats');
Route::get('orders/_insights', [\App\Http\Controllers\Api\OrderController::class, 'insights'])->name('orders.insights');
Route::post('orders/_bulk', [\App\Http\Controllers\Api\OrderController::class, 'bulk'])->name('orders.bulk');
Route::apiResource('orders', \App\Http\Controllers\Api\OrderController::class);
Route::get('posts/_stats', [\App\Http\Controllers\Api\PostController::class, 'stats'])->name('posts.stats');
Route::get('posts/_insights', [\App\Http\Controllers\Api\PostController::class, 'insights'])->name('posts.insights');
Route::post('posts/_bulk', [\App\Http\Controllers\Api\PostController::class, 'bulk'])->name('posts.bulk');
Route::apiResource('posts', \App\Http\Controllers\Api\PostController::class);
// nevela:generated:end
