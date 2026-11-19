<?php

namespace App\Providers;

use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Transport\Dsn;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // A new account must prove its email (a 6-digit code) before it can sign in with a
        // password: no one makes accounts with addresses that aren't theirs.
        config(['nevela.auth.require_email_verification' => true]);

        // Mail through Brevo's API (config/mail.php, "brevo"): HTTPS, so it gets out where SMTP can't.
        Mail::extend('brevo', fn (array $config) => (new BrevoTransportFactory)->create(
            new Dsn('brevo+api', 'default', $config['key'] ?? null),
        ));
    }
}
