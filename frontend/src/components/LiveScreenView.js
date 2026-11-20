import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './GameCanvas';
import RealEmulatorScreen from './RealEmulatorScreen';
import MicroEmulatorRunner from './MicroEmulatorRunner';
import VirtualKeypad from './VirtualKeypad';
import { fetchTabs, createTab } from '../api/tabs';

export default function LiveScreenView({
  tab: initialTab,
  allTabs = [],
  session,
  onBack,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [tabsList, setTabsList] = useState(allTabs);
  const [displayMode, setDisplayMode] = useState('real'); // 'real' (actual running JAR image), 'bot' (image 2 canvas), 'window' (microemulator frame)
  const [scaleMode, setScaleMode] = useState('smooth'); // 'smooth' (Scale4x), 'pixel', 'scale2x', 'original'
  const [viewMode, setViewMode] = useState('foreground'); // 'foreground', 'background'
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Stats state with realistic live fluctuations
  const [ping, setPing] = useState(12);
  const [fpsGame, setFpsGame] = useState(49);
  const [fpsDisplay, setFpsDisplay] = useState(21);
  const [bandwidth, setBandwidth] = useState(52.5);
  const [uptimeSeconds, setUptimeSeconds] = useState(1 * 86400 + 17 * 3600 + 31);

  // Dialogs & inputs
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [inputTextVal, setInputTextVal] = useState('');
  const [sentGameText, setSentGameText] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  // Keypad key action passed to canvas
  const [keyAction, setKeyAction] = useState(null);

  const gameContainerRef = useRef(null);

  // Synchronize tabs list on mount
  useEffect(() => {
    if (allTabs && allTabs.length > 0) {
      setTabsList(allTabs);
    } else {
      fetchTabs(session?.accessToken).then((data) => {
        if (data?.tabs && data.tabs.length > 0) {
          setTabsList(data.tabs);
          // Match tab by id or by name, never force back to tab[0] if user opened tab 2
          setActiveTab((prev) => {
            if (!prev) return data.tabs[0];
            const match = data.tabs.find((t) => t.id === prev.id || t.name === prev.name);
            return match || prev;
          });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fluctuating network & FPS metrics
  useEffect(() => {
    const timer = setInterval(() => {
      // Jitter ping between 10ms and 15ms
      setPing(Math.floor(10 + Math.random() * 5));
      // Game FPS between 48 and 50
      setFpsGame(Math.floor(48 + Math.random() * 3));
      // Display FPS between 20 and 22
      setFpsDisplay(Math.floor(20 + Math.random() * 3));
      // Bandwidth between 50.0 and 55.0 KB/s
      setBandwidth(Number((51.0 + Math.random() * 3.5).toFixed(1)));
      // Increment uptime
      setUptimeSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (totalSec) => {
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const handleReconnect = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
      setPing(11);
    }, 1400);
  };

  const handleToggleFullscreen = () => {
    if (!gameContainerRef.current) return;
    if (!document.fullscreenElement) {
      gameContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (inputTextVal.trim()) {
      setSentGameText(inputTextVal.trim());
      setInputTextVal('');
      setShowTextInputModal(false);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSentGameText(text);
          return;
        }
      }
    } catch (err) {
      // ignore
    }
    // Fallback prompt
    const text = window.prompt('Nhập nội dung cần dán vào game:');
    if (text) setSentGameText(text);
  };

  const handleCreateNewTab = async (e) => {
    e.preventDefault();
    if (!newTabName.trim()) return;
    try {
      const res = await createTab(
        {
          name: newTabName.trim(),
          game_name: activeTab?.game_name || 'Avatar_LAPRO.jar',
          emulator: activeTab?.emulator || 'MicroEmulator',
          count: 1,
        },
        session?.accessToken
      );
      if (res?.tabs?.[0]) {
        setTabsList((prev) => [...prev, res.tabs[0]]);
        setActiveTab(res.tabs[0]);
        setShowCreateModal(false);
        setNewTabName('');
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className={`thuetab-app live-view-root ${darkMode ? 'dark-mode' : ''}`}>
      {/* Top Navbar */}
      <header className="tt-navbar">
        <div className="tt-nav-inner">
          <div className="tt-nav-left">
            <button type="button" className="tt-brand" onClick={onBack}>
              <span className="tt-brand-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </span>
              <span className="tt-brand-name">thuetab</span>
            </button>

            <nav className="tt-nav-links">
              <button type="button" className="tt-nav-item" onClick={onBack}>
                Tab của tôi
              </button>
              <button type="button" className="tt-nav-item">
                Đồng bộ thao tác
              </button>
              <button type="button" className="tt-nav-item">
                Xem tất cả
              </button>
              <button type="button" className="tt-nav-item">
                Mua slot
              </button>
              <button type="button" className="tt-nav-item">
                Nạp tiền & hoá đơn
              </button>
              <button type="button" className="tt-nav-item">
                Tài khoản
              </button>
            </nav>
          </div>

          <div className="tt-nav-right">
            <span className="tt-badge-balance">
              Số dư <strong>0 đ</strong>
            </span>
            <button type="button" className="tt-pill-btn">
              Zalo
            </button>
            <button type="button" className="tt-pill-btn">
              App
            </button>
            <button type="button" className="tt-icon-btn" onClick={onToggleDarkMode}>
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button type="button" className="tt-pill-btn logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb & Action Toolbar */}
      <div className="tt-live-subnav">
        <div className="tt-subnav-inner">
          <div className="tt-subnav-left">
            <button type="button" className="tt-btn-back" onClick={onBack} title="Quay lại Tab của tôi">
              ← Quay lại
            </button>
            <div className="tt-live-meta">
              <span className="tt-breadcrumb">Tab giả lập &gt; {activeTab.game_name}</span>
              <div className="tt-live-title-row">
                <h1 className="tt-live-title">{activeTab.name}</h1>
                <span className="tt-badge-live">
                  <span className="live-dot" /> TRỰC TIẾP
                </span>
              </div>
            </div>
          </div>

          <div className="tt-subnav-actions">
            <button
              type="button"
              className="tt-live-btn"
              onClick={() => setShowTextInputModal(true)}
            >
              ⌨ Gõ chữ
            </button>
            <button type="button" className="tt-live-btn" onClick={handlePasteClipboard}>
              📋 Dán
            </button>
            <button type="button" className="tt-live-btn" onClick={handleReconnect}>
              🔄 Kết nối lại
            </button>
            <button type="button" className="tt-live-btn" onClick={handleToggleFullscreen}>
              ⛶ Toàn màn hình
            </button>
          </div>
        </div>
      </div>

      {/* Main 3-Column Work Area */}
      <div className="tt-live-layout" ref={gameContainerRef}>
        {/* Left Column: Tab list */}
        <aside className="tt-live-sidebar-left">
          <div className="tt-sidebar-header">
            <h3>Tab của bạn</h3>
            <span className="tt-count-pill">
              {tabsList.length} / {Math.max(2, tabsList.length)}
            </span>
          </div>

          <div className="tt-tab-list">
            {tabsList.map((t) => {
              const isActive = t.id === activeTab.id;
              const isRunning = t.status === 'running';

              return (
                <div
                  key={t.id}
                  className={`tt-tab-list-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(t);
                    setKeyAction(null);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="tt-item-top">
                    <span className="tt-item-name">{t.name}</span>
                    <span className={`tt-item-dot ${isRunning ? 'running' : 'stopped'}`} />
                  </div>
                  <span className="tt-item-game">{t.game_name}</span>
                  <span className="tt-item-mode">
                    {t.mode || 'Chạy nền'} · {formatUptime(uptimeSeconds)}
                  </span>
                </div>
              );
            })}

            <button
              type="button"
              className="tt-btn-add-tab"
              onClick={() => setShowCreateModal(true)}
            >
              + Tạo tab mới
            </button>
          </div>
        </aside>

        {/* Center Column: Game Viewport */}
        <main className="tt-live-center">
          {/* Mode Switcher Pill */}
          <div className="tt-mode-switcher-bar">
            <button
              type="button"
              className={`tt-switcher-pill ${displayMode === 'real' ? 'active' : ''}`}
              onClick={() => setDisplayMode('real')}
            >
              🔴 Màn hình Game thực tế (Chạy từ file {activeTab.game_name || 'Avatar_LAPRO.jar'})
            </button>
            <button
              type="button"
              className={`tt-switcher-pill ${displayMode === 'bot' ? 'active' : ''}`}
              onClick={() => setDisplayMode('bot')}
            >
              ☁ Màn hình Bot 24/7 (Ảnh 2)
            </button>
            <button
              type="button"
              className={`tt-switcher-pill ${displayMode === 'window' ? 'active' : ''}`}
              onClick={() => setDisplayMode('window')}
            >
              🕹 Khung MicroEmulator
            </button>
          </div>

          <div className="tt-game-viewport-card">
            {displayMode === 'real' && (
              <>
                <RealEmulatorScreen
                  key={activeTab?.id}
                  tab={activeTab}
                  scaleMode={scaleMode}
                  externalKeyAction={keyAction}
                  inputText={sentGameText}
                  onClearInput={() => setSentGameText(null)}
                  isReconnecting={isReconnecting}
                  onMetricsUpdate={({ latency, fps, bandwidth: bw }) => {
                    setPing(latency);
                    setFpsDisplay(fps);
                    setBandwidth(bw);
                  }}
                />
                <p className="tt-game-notice">
                  Hình ảnh thực tế đang được render trực tiếp từ file JAR bởi MicroEmulator máy chủ.
                </p>
              </>
            )}

            {displayMode === 'bot' && (
              <>
                <GameCanvas
                  tab={activeTab}
                  scaleMode={scaleMode}
                  isReconnecting={isReconnecting}
                  inputText={sentGameText}
                  onClearInput={() => setSentGameText(null)}
                  externalKeyAction={keyAction}
                />
                <p className="tt-game-notice">
                  Đóng trình duyệt không dừng game — tab tiếp tục chạy 24/7 trên máy chủ.
                </p>
              </>
            )}

            {displayMode === 'window' && (
              <MicroEmulatorRunner
                tab={activeTab}
                scaleMode={scaleMode}
                isReconnecting={isReconnecting}
                inputText={sentGameText}
                onClearInput={() => setSentGameText(null)}
                externalKeyAction={keyAction}
              />
            )}
          </div>
        </main>

        {/* Right Column: Status info + Virtual Phone Keypad */}
        <aside className="tt-live-sidebar-right">
          {/* Section: Trạng thái */}
          <div className="tt-status-card">
            <div className="tt-status-header">
              <h3>Trạng thái</h3>
              <span className="tt-badge-running">
                <span className="running-dot" /> Đang chạy
              </span>
            </div>

            <div className="tt-status-metrics-grid">
              <div className="tt-metric-box">
                <span className="metric-label">Kết nối</span>
                <span className="metric-val text-green">Đã kết nối...</span>
              </div>
              <div className="tt-metric-box">
                <span className="metric-label">Độ trễ</span>
                <span className="metric-val">{ping} ms</span>
              </div>
              <div className="tt-metric-box">
                <span className="metric-label">FPS game</span>
                <span className="metric-val">{fpsGame}</span>
              </div>
              <div className="tt-metric-box">
                <span className="metric-label">FPS hiển thị</span>
                <span className="metric-val">{fpsDisplay}</span>
              </div>
              <div className="tt-metric-box">
                <span className="metric-label">Băng thông</span>
                <span className="metric-val">{bandwidth} KB/s</span>
              </div>
              <div className="tt-metric-box">
                <span className="metric-label">Đã chạy</span>
                <span className="metric-val">{formatUptime(uptimeSeconds)}</span>
              </div>
            </div>

            <div className="tt-settings-row">
              <label>Chế độ:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="tt-select-sm"
              >
                <option value="foreground">Đang xem (foreground)</option>
                <option value="background">Chạy nền (background)</option>
              </select>
            </div>

            <div className="tt-settings-row">
              <label>Hình ảnh:</label>
              <select
                value={scaleMode}
                onChange={(e) => setScaleMode(e.target.value)}
                className="tt-select-sm"
              >
                <option value="smooth">Mượt (Scale4x)</option>
                <option value="pixel">Sắc nét (Pixelated)</option>
                <option value="scale2x">Scale 2x</option>
                <option value="original">Gốc (1x)</option>
              </select>
            </div>
          </div>

          {/* Section: Virtual Keypad */}
          <VirtualKeypad onKeyPress={(actionObj) => setKeyAction(actionObj)} />
        </aside>
      </div>

      {/* Modal: Gõ chữ */}
      {showTextInputModal && (
        <div className="tt-modal-overlay">
          <div className="tt-modal-card">
            <h3>Gõ chữ gửi vào game</h3>
            <p className="tt-modal-desc">
              Nhập nội dung cần gõ trực tiếp vào màn hình game J2ME:
            </p>
            <form onSubmit={handleSendText}>
              <input
                type="text"
                value={inputTextVal}
                onChange={(e) => setInputTextVal(e.target.value)}
                placeholder="Ví dụ: Xin chào mọi người, auto farm..."
                className="tt-input"
                autoFocus
              />
              <div className="tt-modal-actions">
                <button
                  type="button"
                  className="tt-btn-secondary"
                  onClick={() => setShowTextInputModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="tt-btn-primary">
                  Gửi vào game
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tạo tab mới */}
      {showCreateModal && (
        <div className="tt-modal-overlay">
          <div className="tt-modal-card">
            <h3>Tạo tab mới</h3>
            <p className="tt-modal-desc">Nhập tên cho tab mới:</p>
            <form onSubmit={handleCreateNewTab}>
              <input
                type="text"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="Ví dụ: Acc phụ, farm_02..."
                className="tt-input"
                autoFocus
              />
              <div className="tt-modal-actions">
                <button
                  type="button"
                  className="tt-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="tt-btn-primary">
                  Tạo tab
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
