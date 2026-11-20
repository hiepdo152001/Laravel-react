<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GameFileController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\TabController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');

// Tab and game management (supports both session/guest and Sanctum auth)
Route::get('/tabs', [TabController::class, 'index']);
Route::post('/tabs', [TabController::class, 'store']);
Route::get('/tabs/{id}', [TabController::class, 'show']);
Route::get('/tabs/{id}/screen', [TabController::class, 'screen']);
Route::get('/tabs/{id}/stream', [TabController::class, 'stream']);
Route::post('/tabs/{id}/key', [TabController::class, 'key']);
Route::post('/tabs/{id}/text', [TabController::class, 'text']);
Route::post('/tabs/{id}/click', [TabController::class, 'click']);
Route::put('/tabs/{id}', [TabController::class, 'update']);
Route::post('/tabs/{id}/toggle', [TabController::class, 'toggle']);
Route::post('/tabs/{id}/restart', [TabController::class, 'restart']);
Route::delete('/tabs/{id}', [TabController::class, 'destroy']);

Route::get('/games', [GameFileController::class, 'index']);
Route::post('/games/upload', [GameFileController::class, 'upload']);
Route::delete('/games/{id}', [GameFileController::class, 'destroy']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
});
