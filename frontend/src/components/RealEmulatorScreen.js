import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTabScreenUrl, getTabStreamUrl, sendTabKey, sendTabText, sendTabClick } from '../api/tabs';
import { playKeyTone } from '../utils/audio';

export default function RealEmulatorScreen({
  tab,
  scaleMode = 'smooth',
  externalKeyAction = null,
  inputText = null,
  onClearInput = () => {},
  isReconnecting = false,
  onMetricsUpdate = null,
}) {
  const [streamMethod, setStreamMethod] = useState('fast'); // 'fast' (20 FPS Chained), 'mjpeg' (Native MJPEG), 'eco' (2 FPS)
  const [keyboardMode, setKeyboardMode] = useState('type'); // 'type' (Full keyboard typing), 'wasd' (PC gamer controls)
  const [inlineText, setInlineText] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);

  const tabId = tab?.id || 1;
  const [activeScreenSrc, setActiveScreenSrc] = useState(() => getTabScreenUrl(tabId));
  const [hasError, setHasError] = useState(false);
  const [frameCounter, setFrameCounter] = useState(0);
  const [liveFps, setLiveFps] = useState(20);
  const [liveLatency, setLiveLatency] = useState(15);

  const isMountedRef = useRef(true);
  const loopTimeoutRef = useRef(null);
  const isFetchingRef = useRef(false);
  const safetyTimeoutRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const frameCountWindowRef = useRef(0);
  const lastFpsCalcRef = useRef(performance.now());
  const onMetricsUpdateRef = useRef(onMetricsUpdate);
  onMetricsUpdateRef.current = onMetricsUpdate;
  const inlineInputRef = useRef(null);

  // Update screen URL when active tab changes
  useEffect(() => {
    setActiveScreenSrc(getTabScreenUrl(tabId));
    setHasError(false);
    isFetchingRef.current = false;
  }, [tabId]);

  // Handle incoming text from external props ("Gõ chữ" or "Dán" modal)
  useEffect(() => {
    if (inputText && tabId) {
      sendTabText(tabId, inputText).then(() => {
        onClearInput();
      });
    }
  }, [inputText, tabId, onClearInput]);

  // High-performance Double-Buffered Adaptive Frame Loop
  const fetchNextFrame = useCallback(() => {
    if (!isMountedRef.current || !tabId || streamMethod === 'mjpeg') return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    const startTime = performance.now();
    const img = new Image();
    const targetUrl = `${getTabScreenUrl(tabId)}&_seq=${Date.now()}`;

    // Safety timeout to prevent isFetchingRef from staying stuck
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    safetyTimeoutRef.current = setTimeout(() => {
      isFetchingRef.current = false;
    }, 2000);

    img.onload = () => {
      if (!isMountedRef.current) return;
      isFetchingRef.current = false;
      setHasError(false);

      const duration = Math.max(1, Math.round(performance.now() - startTime));
      setLiveLatency(duration);

      // Swap double buffer instantly (no blank flicker)
      setActiveScreenSrc(img.src);
      setFrameCounter((prev) => prev + 1);
      frameCountWindowRef.current += 1;

      // Calculate rolling FPS every 1000ms
      const now = performance.now();
      const elapsedWindow = now - lastFpsCalcRef.current;
      if (elapsedWindow >= 1000) {
        const computedFps = Math.max(1, Math.round((frameCountWindowRef.current * 1000) / elapsedWindow));
        setLiveFps(computedFps);
        frameCountWindowRef.current = 0;
        lastFpsCalcRef.current = now;

        if (onMetricsUpdateRef.current) {
          onMetricsUpdateRef.current({
            latency: duration,
            fps: computedFps,
            bandwidth: Number((computedFps * 19.5).toFixed(1)),
          });
        }
      }

      // Adaptive throttle pacing
      const targetInterval = streamMethod === 'eco' ? 500 : 50;
      const delay = Math.max(10, targetInterval - duration);

      loopTimeoutRef.current = setTimeout(() => {
        fetchNextFrame();
      }, delay);
    };

    img.onerror = () => {
      if (!isMountedRef.current) return;
      isFetchingRef.current = false;
      loopTimeoutRef.current = setTimeout(() => {
        fetchNextFrame();
      }, 500);
    };

    img.src = targetUrl;
  }, [tabId, streamMethod]);

  // Visual feedback helper
  const showKeyFeedback = useCallback((label) => {
    setLastFeedback(label);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setLastFeedback(null);
    }, 900);
  }, []);

  // Non-blocking key dispatch to MicroEmulator X11 session
  const dispatchKeyToServer = useCallback(
    (action, label = null) => {
      if (!tabId) return;
      playKeyTone();
      showKeyFeedback(label || action);

      // Fire and forget non-blocking API call
      sendTabKey(tabId, action).catch(() => {});

      // Trigger immediate next frame fetch after key press to update screen quickly
      if (streamMethod === 'fast') {
        if (loopTimeoutRef.current) {
          clearTimeout(loopTimeoutRef.current);
        }
        loopTimeoutRef.current = setTimeout(() => {
          isFetchingRef.current = false;
          fetchNextFrame();
        }, 35);
      }
    },
    [tabId, streamMethod, fetchNextFrame, showKeyFeedback]
  );

  // Direct mouse / touch click on the running emulator screen
  const handleScreenClick = useCallback(
    (e) => {
      if (!tabId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Scale from displayed CSS dimensions to actual 320x540 frame
      const scaleX = 320 / rect.width;
      const scaleY = 540 / rect.height;

      const x = Math.round(clickX * scaleX);
      const y = Math.round(clickY * scaleY);

      playKeyTone();
      showKeyFeedback(`Chạm (${x}, ${y})`);
      sendTabClick(tabId, x, y).catch(() => {});

      if (streamMethod === 'fast') {
        setTimeout(() => {
          isFetchingRef.current = false;
          fetchNextFrame();
        }, 50);
      }
    },
    [tabId, streamMethod, fetchNextFrame, showKeyFeedback]
  );

  // Send whole text string directly to game
  const handleSendTextDirect = useCallback(
    async (text) => {
      if (!tabId || !text) return;
      playKeyTone();
      showKeyFeedback(`Gõ: "${text.length > 15 ? text.slice(0, 15) + '…' : text}"`);

      try {
        await sendTabText(tabId, text);
        if (streamMethod === 'fast') {
          setTimeout(() => {
            isFetchingRef.current = false;
            fetchNextFrame();
          }, 50);
        }
      } catch (err) {
        // ignore
      }
    },
    [tabId, streamMethod, fetchNextFrame, showKeyFeedback]
  );

  // Inline Quick Input Submit (typing or pasting directly into game)
  const handleInlineSubmit = (e) => {
    e.preventDefault();
    if (inlineText.trim()) {
      handleSendTextDirect(inlineText.trim());
      setInlineText('');
    }
  };

  // Paste from clipboard into quick input
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInlineText(text);
          if (inlineInputRef.current) inlineInputRef.current.focus();
          return;
        }
      }
    } catch (err) {
      // fallback
    }
    const text = window.prompt('Nhập nội dung cần gõ vào game:');
    if (text) {
      setInlineText(text);
      if (inlineInputRef.current) inlineInputRef.current.focus();
    }
  };

  // Lifecycle management for frame loop
  useEffect(() => {
    isMountedRef.current = true;

    if (streamMethod === 'fast' || streamMethod === 'eco') {
      fetchNextFrame();
    }

    return () => {
      isMountedRef.current = false;
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [streamMethod, fetchNextFrame]);

  // Listen to external virtual keypad clicks
  useEffect(() => {
    if (externalKeyAction) {
      dispatchKeyToServer(externalKeyAction.action, externalKeyAction.label);
    }
  }, [externalKeyAction, dispatchKeyToServer]);

  // Comprehensive Physical Keyboard Listener (Captures all keys for gaming & direct typing)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow normal typing inside input boxes
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        return;
      }

      // Ignore browser modifier combinations (Ctrl+C, Cmd+R, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      let keyAction = null;
      let label = null;

      // 1. Check WASD gamer mode
      if (keyboardMode === 'wasd') {
        const lower = e.key.toLowerCase();
        if (lower === 'w') {
          keyAction = 'UP';
          label = 'W (Lên)';
        } else if (lower === 's') {
          keyAction = 'DOWN';
          label = 'S (Xuống)';
        } else if (lower === 'a') {
          keyAction = 'LEFT';
          label = 'A (Trái)';
        } else if (lower === 'd') {
          keyAction = 'RIGHT';
          label = 'D (Phải)';
        } else if (lower === 'j') {
          keyAction = 'OK';
          label = 'J (OK)';
        } else if (lower === 'k') {
          keyAction = 'C';
          label = 'K (Xóa)';
        } else if (lower === 'q') {
          keyAction = 'F1';
          label = 'Q (Menu)';
        } else if (lower === 'e') {
          keyAction = 'F2';
          label = 'E (Đóng)';
        }
      }

      // 2. Standard navigation & control keys
      if (!keyAction) {
        switch (e.key) {
          case 'ArrowUp':
            keyAction = 'UP';
            label = '▲ Lên';
            break;
          case 'ArrowDown':
            keyAction = 'DOWN';
            label = '▼ Xuống';
            break;
          case 'ArrowLeft':
            keyAction = 'LEFT';
            label = '◀ Trái';
            break;
          case 'ArrowRight':
            keyAction = 'RIGHT';
            label = '▶ Phải';
            break;
          case 'Enter':
            keyAction = 'OK';
            label = 'Enter (OK)';
            break;
          case ' ':
            keyAction = keyboardMode === 'wasd' ? 'OK' : 'space';
            label = keyboardMode === 'wasd' ? 'Space (OK)' : 'Dấu cách';
            break;
          case 'Backspace':
            keyAction = 'C';
            label = 'Backspace (Xóa)';
            break;
          case 'Delete':
            keyAction = 'Delete';
            label = 'Delete';
            break;
          case 'Escape':
            keyAction = 'F2';
            label = 'Esc (Đóng)';
            break;
          case 'F1':
            keyAction = 'F1';
            label = 'F1 (Menu)';
            break;
          case 'F2':
            keyAction = 'F2';
            label = 'F2 (Đóng)';
            break;
          case 'Tab':
            keyAction = 'Tab';
            label = 'Tab';
            break;
          default:
            break;
        }
      }

      // 3. Numpad Keys (0-9, *, #)
      if (!keyAction && e.code && e.code.startsWith('Numpad')) {
        const num = e.code.replace('Numpad', '');
        if (num >= '0' && num <= '9') {
          keyAction = num;
          label = `Num ${num}`;
        } else if (e.code === 'NumpadMultiply') {
          keyAction = '*';
          label = 'Num *';
        } else if (e.code === 'NumpadEnter') {
          keyAction = 'OK';
          label = 'Num Enter';
        }
      }

      // 4. Direct Typing: Single alphanumeric characters & symbols (a-z, A-Z, 0-9, @, ., _, etc.)
      if (!keyAction && e.key && e.key.length === 1) {
        keyAction = e.key;
        label = `Gõ: ${e.key}`;
      }

      // If a valid key action was recognized, dispatch to server
      if (keyAction) {
        e.preventDefault();
        dispatchKeyToServer(keyAction, label);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardMode, dispatchKeyToServer]);

  const activeSrc = streamMethod === 'mjpeg' && tabId ? getTabStreamUrl(tabId) : activeScreenSrc;

  return (
    <div className="real-emulator-wrapper">
      {/* Live Running Badge & Performance Controls */}
      <div className="real-screen-header">
        <span className="real-screen-title">
          <span className="live-pulse-dot" />
          Tiến trình máy chủ: MicroEmulator ({tab?.game_name || 'Avatar_LAPRO.jar'})
        </span>
        <div className="real-screen-perf-controls">
          <span className="real-fps-badge" title="Tốc độ khung hình thực tế">
            {liveFps} FPS · {liveLatency}ms
          </span>
          <select
            className="real-stream-select"
            value={streamMethod}
            onChange={(e) => {
              setStreamMethod(e.target.value);
              isFetchingRef.current = false;
            }}
            title="Phương thức truyền luồng hình ảnh"
          >
            <option value="fast">⚡ Siêu mượt (20 FPS - RAM)</option>
            <option value="mjpeg">📹 Luồng MJPEG Video</option>
            <option value="eco">🍃 Tiết kiệm Data (2 FPS)</option>
          </select>
        </div>
      </div>

      {/* Screen Frame displaying the REAL screenshot of the running .jar file */}
      <div className="real-screen-frame">
        {isReconnecting ? (
          <div className="real-screen-overlay">
            <span className="spinner" />
            <p>Đang kết nối lại luồng hiển thị...</p>
          </div>
        ) : null}

        {/* Real-time Keystroke Feedback Badge on Screen */}
        {lastFeedback && (
          <div className="real-key-toast" aria-live="polite">
            ⌨️ {lastFeedback}
          </div>
        )}

        <img
          src={activeSrc}
          alt={`Màn hình game thực tế của ${tab?.game_name || 'Avatar_LAPRO.jar'}`}
          className={`real-screen-img ${scaleMode === 'pixel' ? 'pixelated' : ''}`}
          onClick={handleScreenClick}
          title="Bấm chuột trực tiếp vào màn hình hoặc phím số điện thoại để thao tác"
          onError={() => {
            if (frameCounter === 0) setHasError(true);
          }}
          onLoad={() => {
            setHasError(false);
          }}
        />

        {hasError && frameCounter === 0 && (
          <div className="real-screen-fallback">
            <p>☕ Đang kết nối màn hình MicroEmulator máy chủ...</p>
            <button
              type="button"
              className="tt-btn-primary"
              onClick={() => {
                setHasError(false);
                isFetchingRef.current = false;
                fetchNextFrame();
              }}
            >
              Thử tải lại hình ảnh
            </button>
          </div>
        )}
      </div>

      {/* Hardware Keyboard Bar (Mode Selector + Quick Inline Typing Bar) */}
      <div className="real-keyboard-control-card">
        <div className="real-keyboard-header-row">
          <div className="keyboard-active-indicator">
            <span className="kb-active-dot" />
            <strong>Bàn phím máy tính:</strong>
            <span className="kb-active-text">Đang nhận phím trực tiếp</span>
          </div>

          <div className="keyboard-mode-switch">
            <button
              type="button"
              className={`kb-mode-pill ${keyboardMode === 'type' ? 'active' : ''}`}
              onClick={() => setKeyboardMode('type')}
              title="Gõ chữ cái a-z, số, ký tự và mũi tên điều hướng"
            >
              ⌨️ Gõ chữ (Full)
            </button>
            <button
              type="button"
              className={`kb-mode-pill ${keyboardMode === 'wasd' ? 'active' : ''}`}
              onClick={() => setKeyboardMode('wasd')}
              title="Phím game thủ: W A S D di chuyển · J chọn · K xóa · Q/E phím mềm"
            >
              🎮 Game WASD
            </button>
            <button
              type="button"
              className="kb-help-btn"
              onClick={() => setShowCheatsheet((prev) => !prev)}
              title="Xem bảng phím tắt"
            >
              ❓ Phím tắt
            </button>
          </div>
        </div>

        {/* Inline Quick Text Typing Form */}
        <form onSubmit={handleInlineSubmit} className="real-quick-type-form">
          <input
            ref={inlineInputRef}
            type="text"
            className="real-quick-type-input"
            value={inlineText}
            onChange={(e) => setInlineText(e.target.value)}
            placeholder="Gõ tài khoản, mật khẩu hoặc chat tại đây rồi bấm Enter..."
          />
          <button type="submit" className="real-quick-type-btn" title="Gửi văn bản vào game">
            Gửi (Enter)
          </button>
          <button
            type="button"
            className="real-quick-paste-btn"
            onClick={handlePasteClipboard}
            title="Dán từ Clipboard"
          >
            📋 Dán
          </button>
        </form>

        {/* Keyboard Cheatsheet Guide Drawer */}
        {showCheatsheet && (
          <div className="real-keyboard-cheatsheet">
            <div className="cheatsheet-title">
              <span>📖 Hướng dẫn điều khiển bằng bàn phím máy tính:</span>
              <button
                type="button"
                className="cheatsheet-close"
                onClick={() => setShowCheatsheet(false)}
              >
                ✕
              </button>
            </div>
            <div className="cheatsheet-grid">
              <div className="cs-item">
                <kbd>⬆ ⬇ ⬅ ➡</kbd> hoặc <kbd>W A S D</kbd>
                <span>Di chuyển nhân vật / Chọn menu</span>
              </div>
              <div className="cs-item">
                <kbd>Enter</kbd> hoặc <kbd>Space</kbd> / <kbd>J</kbd>
                <span>Chọn / Đồng ý / Bắn (OK)</span>
              </div>
              <div className="cs-item">
                <kbd>F1</kbd> hoặc <kbd>Q</kbd>
                <span>Phím mềm trái (Menu)</span>
              </div>
              <div className="cs-item">
                <kbd>F2</kbd> hoặc <kbd>Esc</kbd> / <kbd>E</kbd>
                <span>Phím mềm phải (Đóng / Hủy)</span>
              </div>
              <div className="cs-item">
                <kbd>Backspace</kbd> hoặc <kbd>K</kbd>
                <span>Xóa ký tự / Phím C</span>
              </div>
              <div className="cs-item">
                <kbd>A - Z</kbd> &amp; <kbd>0 - 9</kbd>
                <span>Gõ chữ cái và số trực tiếp vào game</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="real-screen-subtext">
        <span>Display :{tab?.display || '111'} (RAM /dev/shm)</span>
        <span>PID: {tab?.pid || 'Java 21'}</span>
        <span>Tải khung hình: #{frameCounter}</span>
      </div>
    </div>
  );
}
