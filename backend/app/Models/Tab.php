<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Tab extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'game_name',
        'game_file_id',
        'emulator',
        'status',
        'online_status',
        'mode',
        'fps',
        'restart_count',
        'started_at',
        'events',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'events' => 'array',
        'fps' => 'integer',
        'restart_count' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gameFile(): BelongsTo
    {
        return $this->belongsTo(GameFile::class);
    }
}
