<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // A phone sends a picture as a form; Nevela takes the file as the body (see the class).
        $middleware->api(append: [\App\Http\Middleware\UploadsFromForms::class]);
        // Hosted, requests arrive through the platform's proxy: trust what it says about the
        // address and https, so links Laravel makes (photos, emails) are https.
        $middleware->trustProxies(at: '*');
        // Nevela names this alias only where it adds its routes, which it skips when routes
        // are cached (php artisan optimize, as a hosted start does): named here as well.
        $middleware->alias(['nevela.throttle' => \Nevela\Laravel\Http\PublicThrottle::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
