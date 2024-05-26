<?php

namespace App\Http\Controllers;

use App\Services\UserService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;

class LoginController extends Controller
{

    /**
     * @var UserService
     */
    protected $userService;
     /**
     * @var SocialService
     */
    protected $socialService;
    public function __construct(
        
        UserService $userService,
        )
    {   
        $this->userService = $userService;
    }
    public function login(Request $request)
    {
        $email = $request->email;
        $user = $this->userService->getByEmail($email);
        if (!$user) {
            return response()->json([
                'message' => 'Tài khoản hoặc mật khẩu không chính xác!',
                'status' => false
            ], 401);
        }
    
        $credentials = $request->only('email', 'password');
        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'Mật khẩu không chính xác',
                'status' => false
            ], 401);
        }
        $user->tokens()->delete();
        $imageUrl = 'https://images.pexels.com/photos/598917/pexels-photo-598917.jpeg';
        $imageName = basename(parse_url($imageUrl, PHP_URL_PATH)); // Lấy tên file từ URL

        // Tạo URL tạm thời chỉ với tên ảnh
        $temporaryUrl = URL::temporarySignedRoute(
            'image.show', now()->addMinutes(30), ['path' => $imageName]
        );

        return view('test', ['image' => $temporaryUrl]);

    }

    public function logout(){
        try {
            Auth::logout();
            $cookie = cookie()->forget('api_token');
            return view('test', ['image' => 'https://images.pexels.com/photos/598917/pexels-photo-598917.jpeg']);

        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
