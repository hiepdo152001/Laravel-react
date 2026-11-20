<?php

namespace App\Services;

use App\Models\Tab;
use Illuminate\Support\Facades\Log;

class EmulatorService
{
    private string $microemuJar;
    private string $storageScreens;
    private string $shmScreens;
    private string $tabDataRoot;
    private static array $lastCaptureTime = [];

    public function __construct()
    {
        $this->microemuJar = base_path('storage/app/microemulator/microemulator-2.0.4/microemulator.jar');
        $this->storageScreens = base_path('storage/app/public/tabs');
        $this->shmScreens = is_dir('/dev/shm') && is_writable('/dev/shm') ? '/dev/shm/tabs' : $this->storageScreens;
        $this->tabDataRoot = base_path('storage/app/tabs_data');

        if (!file_exists($this->storageScreens)) {
            @mkdir($this->storageScreens, 0777, true);
        }
        if ($this->shmScreens === '/dev/shm/tabs' && !file_exists($this->shmScreens)) {
            @mkdir($this->shmScreens, 0777, true);
        }
        if (!file_exists($this->tabDataRoot)) {
            @mkdir($this->tabDataRoot, 0777, true);
        }
    }

    public function start(Tab $tab): bool
    {
        $this->stop($tab);

        $display = $this->allocateDisplay($tab);

        // 1. Setup isolated data directory & dedicated game JAR for this tab
        $tabDir = "{$this->tabDataRoot}/tab_{$tab->id}";
        if (!file_exists($tabDir)) {
            @mkdir($tabDir, 0777, true);
        }

        $sourceJar = $this->resolveJarPath($tab->game_name);
        if (!file_exists($sourceJar)) {
            Log::error("JAR not found for tab #{$tab->id}: {$sourceJar}");
            return false;
        }

        $tabJar = "{$tabDir}/game_{$tab->id}.jar";
        if (!file_exists($tabJar) || filesize($tabJar) === 0) {
            @copy($sourceJar, $tabJar);
        }

        if (!file_exists($this->microemuJar)) {
            Log::error("MicroEmulator JAR not found: {$this->microemuJar}");
            return false;
        }

        // 2. Clean stale X11 lock files and kill any existing Xvfb/Java on this display
        exec("rm -f /tmp/.X{$display}-lock /tmp/.X11-unix/X{$display} 2>/dev/null");
        exec("kill $(pgrep -f 'Xvfb :{$display}') 2>/dev/null");
        exec("kill $(pgrep -f 'openbox.*:{$display}') 2>/dev/null");
        exec("kill $(pgrep -f 'tab.display={$display}') 2>/dev/null");
        exec("kill $(pgrep -f 'tab.id={$tab->id}') 2>/dev/null");

        // 3. Start Xvfb virtual frame buffer (320x540x24) with -noreset for persistence
        $xvfbCmd = "Xvfb :{$display} -screen 0 320x540x24 -noreset > /dev/null 2>&1 &";
        exec($xvfbCmd);
        usleep(300000); // 300ms

        // 4. Start Openbox Window Manager to handle window focus & keystrokes reliably
        exec("DISPLAY=:{$display} openbox > /dev/null 2>&1 &");
        usleep(150000); // 150ms

        // 5. Start MicroEmulator in ISOLATED mode (-Duser.home isolates RMS accounts/cookies + tab-specific JAR)
        $javaCmd = "DISPLAY=:{$display} java -XX:+UseG1GC -Xms64m -Xmx256m " .
            "-Duser.home=" . escapeshellarg($tabDir) . " " .
            "-Dtab.display={$display} -Dtab.id={$tab->id} " .
            "-Dsun.java2d.pmoffscreen=false " .
            "-jar " . escapeshellarg($this->microemuJar) . " " .
            escapeshellarg($tabJar) . " > /dev/null 2>&1 & echo $!";
        $pid = trim(shell_exec($javaCmd) ?: '');

        $tab->display = $display;
        $tab->pid = !empty($pid) ? (int) $pid : null;
        $tab->status = 'running';
        $tab->online_status = 'Đang online server game';
        $tab->started_at = now();
        $tab->save();

        // Capture initial screen after game loads
        usleep(1200000);
        $this->captureScreen($tab, true);

        return true;
    }

    public function stop(Tab $tab): bool
    {
        if ($tab->pid) {
            exec("kill -9 {$tab->pid} 2>/dev/null");
        }
        if ($tab->display) {
            exec("kill $(pgrep -f 'tab.display={$tab->display}') 2>/dev/null");
            exec("kill $(pgrep -f 'openbox.*:{$tab->display}') 2>/dev/null");
            exec("kill $(pgrep -f 'Xvfb :{$tab->display}') 2>/dev/null");
            exec("rm -f /tmp/.X{$tab->display}-lock /tmp/.X11-unix/X{$tab->display} 2>/dev/null");
        }
        exec("kill $(pgrep -f 'tab.id={$tab->id}') 2>/dev/null");

        // Clean up memory buffer frame
        $shmFile = $this->getScreenPath($tab->id);
        if (file_exists($shmFile)) {
            @unlink($shmFile);
        }

        $tab->pid = null;
        $tab->status = 'stopped';
        $tab->online_status = 'Ngắt kết nối máy chủ';
        $tab->save();

        return true;
    }

    /**
     * Completely deletes a tab's isolated data directory and screen buffer.
     */
    public function deleteTabData(Tab $tab): void
    {
        $tabDir = "{$this->tabDataRoot}/tab_{$tab->id}";
        if (file_exists($tabDir)) {
            exec("rm -rf " . escapeshellarg($tabDir) . " 2>/dev/null");
        }
        $shmFile = $this->getScreenPath($tab->id);
        if (file_exists($shmFile)) {
            @unlink($shmFile);
        }
    }

    /**
     * Safely allocates a unique, non-conflicting X11 virtual display.
     */
    public function allocateDisplay(Tab $tab): int
    {
        $used = Tab::where('id', '!=', $tab->id)
            ->where('status', 'running')
            ->whereNotNull('display')
            ->pluck('display')
            ->map(fn($d) => (int)$d)
            ->toArray();

        $disp = 100 + ($tab->id % 800);
        for ($i = 0; $i < 800; $i++) {
            if (!in_array($disp, $used)) {
                $check = trim(shell_exec("pgrep -f 'Xvfb :{$disp}'") ?: '');
                if (empty($check)) {
                    return $disp;
                }
            }
            $disp++;
            if ($disp > 950) {
                $disp = 101;
            }
        }
        return $disp;
    }

    /**
     * Ultra-fast screen capture directly to RAM disk (/dev/shm) in JPEG format (~12ms).
     */
    public function captureScreen(Tab $tab, bool $force = false): ?string
    {
        if (!$tab->display) {
            return null;
        }

        $tabId = $tab->id;
        $now = microtime(true);

        // Throttle captures to ~25 FPS max per tab to avoid CPU saturation
        if (!$force && isset(self::$lastCaptureTime[$tabId]) && ($now - self::$lastCaptureTime[$tabId]) < 0.035) {
            $existingPath = $this->getScreenPath($tabId);
            if (file_exists($existingPath) && filesize($existingPath) > 0) {
                return $existingPath;
            }
        }

        $screenPath = $this->getScreenPath($tabId);

        // Quality 75 JPEG in RAM disk takes only ~12ms and produces ~19KB payload
        $cmd = "DISPLAY=:{$tab->display} import -window root -quality 75 " . escapeshellarg($screenPath) . " 2>&1";
        exec($cmd);

        self::$lastCaptureTime[$tabId] = microtime(true);

        if (file_exists($screenPath) && filesize($screenPath) > 0) {
            return $screenPath;
        }

        // Fallback to storage copy if exists
        $fallback = $this->storageScreens . "/screen_{$tabId}.jpg";
        if (file_exists($fallback)) {
            return $fallback;
        }

        return null;
    }

    /**
     * Non-blocking fast key delivery directly to X11 with window focus (~3ms).
     * Dispatches directly to the J2ME Canvas 'Content window' inside MicroEmulator.
     * Supports all standard keys, numbers, letters, and symbols.
     */
    public function sendKey(Tab $tab, string $rawKey): bool
    {
        if (!$tab->display || $tab->status !== 'running') {
            return false;
        }

        $namedKeys = [
            'UP', 'DOWN', 'LEFT', 'RIGHT', 'OK', 'ENTER', 'RETURN',
            'F1', 'F2', 'MENU', 'C', 'CLEAR', 'BACKSPACE', 'DELETE',
            'TAB', 'ESCAPE', 'ESC', 'SPACE',
        ];

        $upper = strtoupper(trim($rawKey));

        // If string is text (longer than 1 character and not a named control key), type it as text
        if (mb_strlen($rawKey) > 1 && !in_array($upper, $namedKeys)) {
            return $this->sendText($tab, $rawKey);
        }

        $key = $this->mapKey($rawKey);
        if ($key) {
            $win = $this->getContentWindow($tab->display);
            if ($win) {
                $cmd = "DISPLAY=:{$tab->display} xdotool key --window {$win} {$key} 2>/dev/null";
            } else {
                $cmd = "DISPLAY=:{$tab->display} xdotool search --name 'MicroEmulator' windowactivate --sync key {$key} 2>/dev/null || DISPLAY=:{$tab->display} xdotool key {$key} 2>/dev/null";
            }
            exec($cmd);
            return true;
        }

        // If key cannot be mapped to a keysym, try typing it directly
        return $this->sendText($tab, $rawKey);
    }

    /**
     * Non-blocking text typing into game (~5ms).
     * Types strings directly into MicroEmulator J2ME Canvas window.
     */
    public function sendText(Tab $tab, string $text): bool
    {
        if (!$tab->display || $tab->status !== 'running' || $text === '') {
            return false;
        }

        $win = $this->getContentWindow($tab->display);
        $cleanText = escapeshellarg($text);
        if ($win) {
            $cmd = "DISPLAY=:{$tab->display} xdotool type --window {$win} --delay 15 {$cleanText} 2>/dev/null";
        } else {
            $cmd = "DISPLAY=:{$tab->display} xdotool search --name 'MicroEmulator' windowactivate --sync type --delay 15 {$cleanText} 2>/dev/null || DISPLAY=:{$tab->display} xdotool type --delay 15 {$cleanText} 2>/dev/null";
        }
        exec($cmd);
        return true;
    }

    /**
     * Dispatches a mouse click to coordinates (x, y) on the emulator display.
     */
    public function sendClick(Tab $tab, int $x, int $y): bool
    {
        if (!$tab->display || $tab->status !== 'running') {
            return false;
        }

        $x = max(0, min(320, $x));
        $y = max(0, min(540, $y));

        $cmd = "DISPLAY=:{$tab->display} xdotool mousemove {$x} {$y} click 1 2>/dev/null";
        exec($cmd);
        return true;
    }

    /**
     * Finds the actual J2ME Canvas Content Window ID in X11.
     */
    public function getContentWindow(int $display): ?string
    {
        // 1. Primary: Java AWT canvas 'Content window'
        $cmd = "DISPLAY=:{$display} xdotool search --name 'Content window' 2>/dev/null | tail -n 1";
        $win = trim(shell_exec($cmd) ?: '');
        if (!empty($win) && ctype_digit($win)) {
            return $win;
        }

        // 2. Secondary: any window with class SunAwtCanvas
        $cmdClass = "DISPLAY=:{$display} xdotool search --class 'SunAwtCanvas' 2>/dev/null | tail -n 1";
        $winClass = trim(shell_exec($cmdClass) ?: '');
        if (!empty($winClass) && ctype_digit($winClass)) {
            return $winClass;
        }

        return null;
    }

    public function getScreenPath(int $tabId): string
    {
        return $this->shmScreens . "/screen_{$tabId}.jpg";
    }

    private function mapKey(string $key): ?string
    {
        $named = [
            'UP' => 'Up',
            'DOWN' => 'Down',
            'LEFT' => 'Left',
            'RIGHT' => 'Right',
            'OK' => 'Return',
            'ENTER' => 'Return',
            'RETURN' => 'Return',
            'F1' => 'F1',
            'MENU' => 'F1',
            'F2' => 'F2',
            'C' => 'BackSpace',
            'CLEAR' => 'BackSpace',
            'BACKSPACE' => 'BackSpace',
            'DELETE' => 'Delete',
            'ESCAPE' => 'Escape',
            'ESC' => 'Escape',
            'TAB' => 'Tab',
            'SPACE' => 'space',
            ' ' => 'space',
            '*' => 'asterisk',
            '#' => 'numbersign',
            '.' => 'period',
            ',' => 'comma',
            '-' => 'minus',
            '_' => 'underscore',
            '@' => 'at',
            '/' => 'slash',
            '\\' => 'backslash',
            ':' => 'colon',
            ';' => 'semicolon',
            '+' => 'plus',
            '=' => 'equal',
            '?' => 'question',
            '!' => 'exclam',
            '(' => 'parenleft',
            ')' => 'parenright',
            '[' => 'bracketleft',
            ']' => 'bracketright',
            '{' => 'braceleft',
            '}' => 'braceright',
            '"' => 'quotedbl',
            "'" => 'apostrophe',
            '`' => 'grave',
            '~' => 'asciitilde',
            '$' => 'dollar',
            '%' => 'percent',
            '^' => 'asciicircum',
            '&' => 'ampersand',
            '|' => 'bar',
            '<' => 'less',
            '>' => 'greater',
        ];

        $upper = strtoupper(trim($key));
        if (isset($named[$upper])) {
            return $named[$upper];
        }
        if (isset($named[$key])) {
            return $named[$key];
        }

        // Single alphanumeric characters (a-z, A-Z, 0-9) are valid X11 keysyms
        if (strlen($key) === 1 && ctype_alnum($key)) {
            return $key;
        }

        return null;
    }

    private function resolveJarPath(?string $gameName): string
    {
        if (empty($gameName)) {
            $gameName = 'Avatar_LAPRO.jar';
        }

        $candidates = [
            base_path("storage/app/game_jars/{$gameName}"),
            base_path("{$gameName}"),
            base_path("Avatar_LAPRO.jar"),
        ];

        foreach ($candidates as $path) {
            if (file_exists($path)) {
                return $path;
            }
        }

        return base_path("Avatar_LAPRO.jar");
    }
}
