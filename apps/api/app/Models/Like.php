<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A drink someone likes, kept for them under Likes on the phone.
 *
 * Not a Nevela resource on purpose: liking is a tap, not a record to run. It has no trash
 * (unliking removes the row) and tells no one in the bell.
 */
class Like extends Model
{
    protected $fillable = ['user_id', 'beverage_id'];
}
