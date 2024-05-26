<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\ImageController;
use App\Http\Controllers\LoginController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/login', function () {
    return view('login');
});

Route::get('/auth/google/url', [AuthController::class, 'googleLoginUrl']);
Route::get('/auth/google/callback', [AuthController::class, 'loginCallback']);
Route::get('/test', [AuthController::class, 'test'])->middleware('checkRole:user');

Route::get('/image/{path}', [ImageController::class, 'show'])
    ->middleware(['auth', 'signed'])
    ->name('image.show')
    ->where('path', '.*');
Route::post('/login', [LoginController::class, 'login'])->name('login');
Route::get('/logout', [LoginController::class, 'logout'])->name('logout');



