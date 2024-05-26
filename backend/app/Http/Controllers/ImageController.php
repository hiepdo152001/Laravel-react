<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ImageController extends Controller
{
    public function show(Request $request, $path)
    {

        $imageURL = 'https://images.pexels.com/photos/598917/' . $path;

        // Tải nội dung ảnh từ URL bên ngoài
        $response = Http::get($imageURL);

        if ($response->failed()) {
            abort(404);
        }

        // Lấy loại ảnh (MIME type)
        $mimeType = $response->header('Content-Type');

        // Trả về phản hồi ảnh
        return Response::make($response->body(), 200, [
            'Content-Type' => $mimeType,
        ]);

    }


}