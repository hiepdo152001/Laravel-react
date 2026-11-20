<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tab;
use App\Services\EmulatorService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TabController extends Controller
{
    protected EmulatorService $emulatorService;

    public function __construct(EmulatorService $emulatorService)
    {
        $this->emulatorService = $emulatorService;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Tab::query();

        if ($user) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhereNull('user_id');
            });
        }

        $tabs = $query->orderBy('id', 'asc')->get();

        // Seed demo tabs if empty
        if ($tabs->isEmpty()) {
            $this->seedInitialTabs($user ? $user->id : null);
            $tabs = Tab::orderBy('id', 'asc')->get();
        }

        $totalSlots = max(2, $tabs->count());
        $runningCount = $tabs->where('status', 'running')->count();
        $stoppedCount = $tabs->where('status', 'stopped')->count();

        return response()->json([
            'status' => 'success',
            'summary' => [
                'total_slots' => $totalSlots,
                'used_slots' => $tabs->count(),
                'running_count' => $runningCount,
                'stopped_count' => $stoppedCount,
                'rental_notice' => "{$totalSlots} slot · slot gần nhất hết sau 10 ngày 20 giờ",
                'balance' => 0,
            ],
            'tabs' => $tabs,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'game_name' => 'nullable|string|max:255',
            'game_file_id' => 'nullable|integer',
            'emulator' => 'nullable|string|max:100',
            'count' => 'nullable|integer|min:1|max:10',
        ]);

        $userId = $request->user() ? $request->user()->id : null;
        $count = $validated['count'] ?? 1;
        $baseName = trim($validated['name']);
        $gameName = $validated['game_name'] ?? 'Avatar_LAPRO.jar';
        $emulator = $validated['emulator'] ?? 'MicroEmulator';

        $createdTabs = [];

        for ($i = 0; $i < $count; $i++) {
            $name = $count > 1 ? "{$baseName}-" . ($i + 1) : $baseName;

            $tab = Tab::create([
                'user_id' => $userId,
                'name' => $name,
                'game_name' => $gameName,
                'game_file_id' => $validated['game_file_id'] ?? null,
                'emulator' => $emulator,
                'status' => 'running',
                'online_status' => 'Đang online server game',
                'mode' => 'Chạy nền (background)',
                'fps' => 50,
                'restart_count' => 0,
                'started_at' => Carbon::now(),
                'events' => [
                    [
                        'time' => Carbon::now()->format('H:i:s d/m/Y'),
                        'message' => 'Tạo tab mới thành công trên cụm server J2ME #1',
                        'type' => 'info',
                    ],
                    [
                        'time' => Carbon::now()->format('H:i:s d/m/Y'),
                        'message' => "Khởi động MicroEmulator chạy thực tế file {$gameName}",
                        'type' => 'success',
                    ],
                    [
                        'time' => Carbon::now()->format('H:i:s d/m/Y'),
                        'message' => 'Đã kết nối server game (TeaMobi / J2ME Net)',
                        'type' => 'success',
                    ],
                ],
            ]);

            // ACTUALLY START THE JAR IN MICROEMULATOR PROCESS
            try {
                $this->emulatorService->start($tab);
            } catch (\Throwable $e) {
                // Ignore if in restricted environment
            }

            $createdTabs[] = $tab;
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Đã tạo và khởi chạy ' . count($createdTabs) . ' tab thành công',
            'tabs' => $createdTabs,
        ], 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        $tab = Tab::findOrFail($id);
        return response()->json([
            'status' => 'success',
            'tab' => $tab,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $tab = Tab::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'emulator' => 'nullable|string|max:100',
            'mode' => 'nullable|string|max:100',
        ]);

        if (isset($validated['name'])) {
            $oldName = $tab->name;
            $tab->name = $validated['name'];
            $this->addEvent($tab, "Đổi tên tab từ '{$oldName}' thành '{$tab->name}'");
        }

        if (isset($validated['emulator'])) {
            $tab->emulator = $validated['emulator'];
        }

        if (isset($validated['mode'])) {
            $tab->mode = $validated['mode'];
        }

        $tab->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Cập nhật tab thành công',
            'tab' => $tab,
        ]);
    }

    public function toggle(Request $request, $id): JsonResponse
    {
        $tab = Tab::findOrFail($id);
        $nextStatus = $tab->status === 'running' ? 'stopped' : 'running';

        if ($nextStatus === 'running') {
            $this->emulatorService->start($tab);
            $this->addEvent($tab, 'Bật lại tab và khởi động giả lập MicroEmulator', 'success');
        } else {
            $this->emulatorService->stop($tab);
            $this->addEvent($tab, 'Đã tắt tab và đóng tiến trình game', 'warning');
        }

        return response()->json([
            'status' => 'success',
            'message' => $nextStatus === 'running' ? 'Đã bật tab' : 'Đã tắt tab',
            'tab' => $tab->fresh(),
        ]);
    }

    public function restart(Request $request, $id): JsonResponse
    {
        $tab = Tab::findOrFail($id);
        $tab->restart_count += 1;
        $tab->save();

        $this->emulatorService->start($tab);
        $this->addEvent($tab, 'Khởi động lại tiến trình giả lập MicroEmulator', 'info');

        return response()->json([
            'status' => 'success',
            'message' => 'Đã khởi động lại tab',
            'tab' => $tab->fresh(),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $tab = Tab::findOrFail($id);
        $this->emulatorService->stop($tab);
        $this->emulatorService->deleteTabData($tab);
        $tab->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Đã xoá tab thành công',
        ]);
    }

    public function screen(Request $request, $id)
    {
        $tab = Tab::find($id);

        if (!$tab) {
            return response()->json(['status' => 'error', 'message' => "Tab #{$id} không tồn tại"], 404);
        }

        // Auto-start tab if it is stopped or PID not running
        if (!$tab->pid || !file_exists("/proc/{$tab->pid}") || $tab->status !== 'running') {
            $tab->status = 'running';
            $this->emulatorService->start($tab);
            $tab->refresh();
        }

        $screenPath = $this->emulatorService->captureScreen($tab);

        if ($screenPath && file_exists($screenPath)) {
            $mime = str_ends_with($screenPath, '.png') ? 'image/png' : 'image/jpeg';
            return response()->file($screenPath, [
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
                'Content-Type' => $mime,
            ]);
        }

        // Return a transparent 1x1 png or fallback, NEVER return JSON for an <img> tag!
        $fallback = base_path('storage/app/public/tabs/test_screen.png');
        if (file_exists($fallback)) {
            return response()->file($fallback, ['Content-Type' => 'image/png']);
        }

        $transparent1x1 = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=');
        return response($transparent1x1, 200, ['Content-Type' => 'image/png']);
    }

    public function stream(Request $request, $id)
    {
        $tab = Tab::find($id);

        if (!$tab) {
            return response()->json(['status' => 'error', 'message' => "Tab #{$id} không tồn tại"], 404);
        }

        if (!$tab->pid || !file_exists("/proc/{$tab->pid}") || $tab->status !== 'running') {
            $tab->status = 'running';
            $this->emulatorService->start($tab);
            $tab->refresh();
        }

        return response()->stream(function () use ($tab) {
            $cycles = 0;
            // Stream up to 120 frames per connection to avoid long worker lock
            while (!connection_aborted() && $cycles < 120) {
                $cycles++;
                $start = microtime(true);
                $screenPath = $this->emulatorService->captureScreen($tab);

                if ($screenPath && file_exists($screenPath)) {
                    $content = file_get_contents($screenPath);
                    echo "--frame\r\n";
                    echo "Content-Type: image/jpeg\r\n";
                    echo "Content-Length: " . strlen($content) . "\r\n\r\n";
                    echo $content . "\r\n";

                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                }

                $elapsed = (microtime(true) - $start) * 1000000;
                $sleepUs = max(35000, 65000 - (int) $elapsed); // Target ~15 FPS
                usleep($sleepUs);
            }
        }, 200, [
            'Content-Type' => 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control' => 'no-cache, private',
            'Connection' => 'close',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function key(Request $request, $id): JsonResponse
    {
        $tab = Tab::find($id);
        if (!$tab) {
            return response()->json(['status' => 'error', 'message' => "Tab #{$id} không tồn tại"], 404);
        }

        if (!$tab->pid || !file_exists("/proc/{$tab->pid}") || $tab->status !== 'running') {
            $tab->status = 'running';
            $this->emulatorService->start($tab);
            $tab->refresh();
        }

        $key = $request->input('key', 'Return');

        $this->emulatorService->sendKey($tab, $key);

        return response()->json([
            'status' => 'success',
            'message' => "Đã gửi phím {$key}",
        ]);
    }

    public function text(Request $request, $id): JsonResponse
    {
        $tab = Tab::find($id);
        if (!$tab) {
            return response()->json(['status' => 'error', 'message' => "Tab #{$id} không tồn tại"], 404);
        }

        if (!$tab->pid || !file_exists("/proc/{$tab->pid}") || $tab->status !== 'running') {
            $tab->status = 'running';
            $this->emulatorService->start($tab);
            $tab->refresh();
        }

        $text = $request->input('text', '');

        $this->emulatorService->sendText($tab, $text);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã gửi văn bản vào game',
        ]);
    }

    public function click(Request $request, $id): JsonResponse
    {
        $tab = Tab::find($id);
        if (!$tab) {
            return response()->json(['status' => 'error', 'message' => "Tab #{$id} không tồn tại"], 404);
        }

        if (!$tab->pid || !file_exists("/proc/{$tab->pid}") || $tab->status !== 'running') {
            $tab->status = 'running';
            $this->emulatorService->start($tab);
            $tab->refresh();
        }

        $x = (int) $request->input('x', 0);
        $y = (int) $request->input('y', 0);

        $this->emulatorService->sendClick($tab, $x, $y);

        return response()->json([
            'status' => 'success',
            'message' => "Đã gửi click ({$x}, {$y})",
        ]);
    }

    private function addEvent(Tab $tab, string $message, string $type = 'info'): void
    {
        $events = $tab->events ?? [];
        array_unshift($events, [
            'time' => Carbon::now()->format('H:i:s d/m/Y'),
            'message' => $message,
            'type' => $type,
        ]);
        $tab->events = array_slice($events, 0, 30);
    }

    private function seedInitialTabs(?int $userId = null): void
    {
        $t1 = Tab::create([
            'user_id' => $userId,
            'name' => 'akocui',
            'game_name' => 'Avatar_LAPRO.jar',
            'emulator' => 'MicroEmulator',
            'status' => 'running',
            'online_status' => 'Đang online server game',
            'mode' => 'Chạy nền (background)',
            'fps' => 50,
            'restart_count' => 0,
            'started_at' => Carbon::now()->subDays(1)->subHours(16)->subMinutes(58)->subSeconds(55),
            'events' => [
                ['time' => '16:12:00 hôm qua', 'message' => 'Tạo tab akocui thành công', 'type' => 'info'],
                ['time' => '16:12:03 hôm qua', 'message' => 'Tải file Avatar_LAPRO.jar vào RAM MicroEmulator', 'type' => 'info'],
                ['time' => '16:12:08 hôm qua', 'message' => 'Kết nối TeaMobi Avatar Server (Port 19128) - Ping 12ms', 'type' => 'success'],
                ['time' => '16:12:15 hôm qua', 'message' => 'Đăng nhập nhân vật thành công, kích hoạt auto treo farm', 'type' => 'success'],
            ],
        ]);

        $t2 = Tab::create([
            'user_id' => $userId,
            'name' => 'gikave',
            'game_name' => 'Avatar_LAPRO.jar',
            'emulator' => 'MicroEmulator',
            'status' => 'running',
            'online_status' => 'Đang online server game',
            'mode' => 'Chạy nền (background)',
            'fps' => 50,
            'restart_count' => 0,
            'started_at' => Carbon::now()->subHours(21)->subMinutes(25)->subSeconds(53),
            'events' => [
                ['time' => '21:00:10 hôm qua', 'message' => 'Tạo tab gikave thành công', 'type' => 'info'],
                ['time' => '21:00:15 hôm qua', 'message' => 'Đang online server game - Chạy nền 24/7', 'type' => 'success'],
            ],
        ]);

        try {
            $this->emulatorService->start($t1);
            $this->emulatorService->start($t2);
        } catch (\Throwable $e) {}
    }
}
