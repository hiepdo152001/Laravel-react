<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('avatar')) {
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        unset($data['password_confirmation']);
        $user = User::create([
            ...$data,
            'password' => Hash::make($data['password']),
        ]);

        return response()->json([
            'message' => 'Tạo tài khoản thành công.',
            ...$this->tokenResponse($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'message' => 'Email hoặc mật khẩu không chính xác.',
            ], 401);
        }

        $user = $request->user();

        return response()->json($this->tokenResponse($user));
    }

    public function user(): JsonResponse
    {
        return response()->json([
            'user' => $this->publicUser(request()->user()),
        ]);
    }

    public function logout(): JsonResponse
    {
        request()->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Đã đăng xuất.']);
    }

    private function tokenResponse(User $user): array
    {
        return [
            'access_token' => $user->createToken('frontend')->plainTextToken,
            'token_type' => 'Bearer',
            'user' => $this->publicUser($user),
        ];
    }

    private function publicUser(User $user): array
    {
        return $user->only([
            'id',
            'name',
            'email',
            'user_name',
            'birth_day',
            'gen',
            'my_name',
            'phone',
            'address',
            'university',
            'avatar',
        ]);
    }
}
