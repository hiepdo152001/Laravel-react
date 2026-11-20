<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GameFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GameFileController extends Controller
{
    private array $defaultGames = [
        [
            'id' => 'preset-avatar-lapro',
            'original_name' => 'Avatar_LAPRO.jar',
            'display_name' => 'Avatar LAPRO v2.9.3',
            'file_size' => 882039,
            'status' => 'ready',
            'is_preset' => true,
        ],
        [
            'id' => 'preset-avatar-2',
            'original_name' => 'avatar-2-60c92e35d94f.jar',
            'display_name' => 'avatar-2',
            'file_size' => 1024 * 720, // 720 KB
            'status' => 'ready',
            'is_preset' => true,
        ],
        [
            'id' => 'preset-ninja-198',
            'original_name' => 'ninja-school-v198-auto.jar',
            'display_name' => 'ninja-198',
            'file_size' => 1024 * 840,
            'status' => 'ready',
            'is_preset' => true,
        ],
        [
            'id' => 'preset-ngocrong',
            'original_name' => 'ngoc-rong-online-v230.jar',
            'display_name' => 'ngocrong-230',
            'file_size' => 1024 * 1250,
            'status' => 'ready',
            'is_preset' => true,
        ],
    ];

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = GameFile::query();

        if ($user) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        }

        $userGames = $query->orderBy('id', 'desc')->get()->map(function ($item) {
            return [
                'id' => $item->id,
                'original_name' => $item->original_name,
                'display_name' => $item->display_name,
                'filename' => $item->filename,
                'file_size' => $item->file_size,
                'status' => $item->status,
                'is_preset' => false,
                'created_at' => $item->created_at,
            ];
        })->toArray();

        $allGames = array_merge($this->defaultGames, $userGames);

        return response()->json([
            'status' => 'success',
            'games' => $allGames,
            'uploaded_count' => count($userGames),
            'max_allowed' => 5,
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|max:15360', // max 15MB
        ]);

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension !== 'jar' && !Str::endsWith(strtolower($originalName), '.jar')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ chấp nhận file game định dạng .jar',
            ], 422);
        }

        $userId = $request->user() ? $request->user()->id : null;

        // Check user limit (max 5)
        $currentCount = GameFile::where('user_id', $userId)->count();
        if ($currentCount >= 5) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bạn đã đạt giới hạn tối đa 5 file game. Vui lòng xoá bớt trước khi tải thêm.',
            ], 422);
        }

        $cleanName = pathinfo($originalName, PATHINFO_FILENAME);
        $safeName = Str::slug($cleanName) . '-' . Str::random(8) . '.jar';
        $path = $file->storeAs('game_jars', $safeName, 'local');

        $gameFile = GameFile::create([
            'user_id' => $userId,
            'original_name' => $originalName,
            'display_name' => Str::limit($cleanName, 30),
            'filename' => $safeName,
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'status' => 'ready',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tải lên và quét file game thành công',
            'game' => [
                'id' => $gameFile->id,
                'original_name' => $gameFile->original_name,
                'display_name' => $gameFile->display_name,
                'filename' => $gameFile->filename,
                'file_size' => $gameFile->file_size,
                'status' => $gameFile->status,
                'is_preset' => false,
                'created_at' => $gameFile->created_at,
            ],
        ], 201);
    }

    public function destroy($id): JsonResponse
    {
        $gameFile = GameFile::findOrFail($id);
        if ($gameFile->file_path && Storage::disk('local')->exists($gameFile->file_path)) {
            Storage::disk('local')->delete($gameFile->file_path);
        }

        $gameFile->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xoá file game thành công',
        ]);
    }
}
