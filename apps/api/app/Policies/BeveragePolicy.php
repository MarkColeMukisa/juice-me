<?php

namespace App\Policies;

use App\Models\Beverage;
use App\Models\User;

/**
 * Who may do what with Beverages. Generated once — this file is yours.
 *
 * Each action asks for a permission, which a person has through their roles
 * (the dashboard's Roles screen). Add your own conditions beside them, e.g.
 * `return $user->can('beverages.edit') && $beverage->user_id === $user->id;`.
 */
class BeveragePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('beverages.view');
    }

    public function view(User $user, Beverage $beverage): bool
    {
        return $user->can('beverages.view');
    }

    public function create(User $user): bool
    {
        return $user->can('beverages.create');
    }

    public function update(User $user, Beverage $beverage): bool
    {
        return $user->can('beverages.edit');
    }

    public function delete(User $user, Beverage $beverage): bool
    {
        return $user->can('beverages.delete');
    }

    /** Bring a deleted one back from the trash. */
    public function restore(User $user, Beverage $beverage): bool
    {
        return $user->can('beverages.delete');
    }

    /** Remove a deleted one from the trash, for good. */
    public function forceDelete(User $user, Beverage $beverage): bool
    {
        return $user->can('beverages.delete');
    }
}
