<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Email verification is now required to sign in with a password. The administrators, who
// were made at the console, are counted as verified so they aren't locked out of their own
// shop. Everyone else verifies with a code the next time they sign in.
return new class extends Migration
{
    public function up(): void
    {
        $admins = DB::table('nevela_role_user')
            ->join('nevela_roles', 'nevela_roles.id', '=', 'nevela_role_user.role_id')
            ->where('nevela_roles.name', 'ADMIN')
            ->pluck('nevela_role_user.user_id');

        DB::table('users')->whereIn('id', $admins)->whereNull('email_verified_at')->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Nothing to undo: a verified address stays verified.
    }
};
