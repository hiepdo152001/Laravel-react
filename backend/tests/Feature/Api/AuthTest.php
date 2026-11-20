<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_register_and_access_their_account(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Minh Anh',
            'user_name' => 'minhanh',
            'email' => 'minhanh@example.com',
            'phone' => '0912345678',
            'birth_day' => '2000-05-12',
            'gen' => 'female',
            'password' => 'a-secure-password',
            'password_confirmation' => 'a-secure-password',
        ]);

        $response->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', 'minhanh@example.com');

        $this->withToken($response->json('access_token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.user_name', 'minhanh');
    }

    public function test_a_user_can_log_in_and_revoke_their_token(): void
    {
        $user = User::create([
            'name' => 'Minh Anh',
            'user_name' => 'minhanh',
            'email' => 'minhanh@example.com',
            'phone' => '0912345678',
            'birth_day' => '2000-05-12',
            'gen' => 'female',
            'password' => 'a-secure-password',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'a-secure-password',
        ]);

        $response->assertOk()->assertJsonPath('user.id', $user->id);

        $this->withToken($response->json('access_token'))
            ->postJson('/api/logout')
            ->assertOk();

        $this->withToken($response->json('access_token'))
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_registration_reports_validation_errors(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Minh Anh',
            'email' => 'not-an-email',
            'password' => 'short',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'user_name', 'birth_day', 'gen', 'phone', 'password']);
    }

    public function test_a_user_can_request_and_complete_a_password_reset(): void
    {
        Notification::fake();
        $user = User::create([
            'name' => 'Minh Anh',
            'user_name' => 'minhanh',
            'email' => 'minhanh@example.com',
            'phone' => '0912345678',
            'birth_day' => '2000-05-12',
            'gen' => 'female',
            'password' => 'a-secure-password',
        ]);

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk();

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $user->email,
            'password' => 'a-new-secure-password',
            'password_confirmation' => 'a-new-secure-password',
        ])->assertOk();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'a-new-secure-password',
        ])->assertOk();
    }
}
