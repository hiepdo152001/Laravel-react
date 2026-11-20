import React, { useState, useEffect } from 'react';
import GameCanvas from './GameCanvas';

export default function MicroEmulatorRunner({
  tab,
  scaleMode = 'smooth',
  isReconnecting = false,
  inputText = null,
  onClearInput = () => {},
  externalKeyAction = null,
}) {
  const [emulatorState, setEmulatorState] = useState('running'); // 'running', 'paused'
  const [deviceSkin, setDeviceSkin] = useState('microemulator'); // 'microemulator', 'nokia'
  const [jarUrl] = useState('/Avatar_LAPRO.jar');
  const [jarMeta, setJarMeta] = useState({
    name: 'Avatar LAPRO',
    version: '2.9.3',
    vendor: 'TeaMobi',
    midlet: 'vn.lapro.GameMidlet',
    size: '882 KB',
    profile: 'MIDP-2.0 / CLDC-1.0',
  });

  useEffect(() => {
    if (tab?.game_name && tab.game_name !== 'Avatar_LAPRO.jar') {
      setJarMeta((prev) => ({
        ...prev,
        name: tab.game_name.replace(/\.[^/.]+$/, ''),
      }));
    }
  }, [tab]);

  const handleDownloadJar = () => {
    const a = document.createElement('a');
    a.href = jarUrl;
    a.download = tab?.game_name || 'Avatar_LAPRO.jar';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpenWebEmulator = () => {
    // Open freej2me-web player with instructions or file loader
    window.open('https://zb3.github.io/freej2me-web/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`microemulator-container skin-${deviceSkin}`}>
      {/* Emulator Window Header */}
      <div className="me-window-header">
        <div className="me-window-title">
          <span className="me-icon">☕</span>
          <span>MicroEmulator 2.0.4 - [{tab?.game_name || 'Avatar_LAPRO.jar'}]</span>
        </div>
        <div className="me-window-controls">
          <button type="button" className="me-win-btn" title="Thu nhỏ">_</button>
          <button type="button" className="me-win-btn" title="Phóng to">□</button>
          <button type="button" className="me-win-btn close" title="Đóng">✕</button>
        </div>
      </div>

      {/* Classic Emulator Menu Bar */}
      <div className="me-menu-bar">
        <span className="me-menu-item">File</span>
        <span className="me-menu-item">Options</span>
        <span className="me-menu-item">View</span>
        <span className="me-menu-item">Help</span>
        <div className="me-meta-tag">
          <span className="meta-badge">{jarMeta.name} v{jarMeta.version}</span>
          <span className="meta-vendor">{jarMeta.vendor}</span>
        </div>
      </div>

      {/* Emulator Toolbar */}
      <div className="me-toolbar">
        <button
          type="button"
          className="me-tool-btn"
          onClick={() => setEmulatorState((s) => (s === 'running' ? 'paused' : 'running'))}
        >
          {emulatorState === 'running' ? '⏸ Tạm dừng' : '▶ Tiếp tục'}
        </button>
        <button
          type="button"
          className="me-tool-btn"
          onClick={() => window.location.reload()}
        >
          🔄 Nạp lại JAR
        </button>
        <button
          type="button"
          className="me-tool-btn"
          onClick={handleDownloadJar}
          title="Tải file Avatar_LAPRO.jar về máy tính"
        >
          ⬇ Tải file JAR ({jarMeta.size})
        </button>
        <button
          type="button"
          className="me-tool-btn highlight"
          onClick={handleOpenWebEmulator}
          title="Mở trên FreeJ2ME Web Player"
        >
          🌐 Chạy FreeJ2ME Web
        </button>

        <div className="me-skin-selector">
          <label>Skin:</label>
          <select
            value={deviceSkin}
            onChange={(e) => setDeviceSkin(e.target.value)}
            className="me-skin-dropdown"
          >
            <option value="microemulator">MicroEmulator 2.0</option>
            <option value="nokia">Nokia 6300 / J2ME</option>
          </select>
        </div>
      </div>

      {/* Live Screen Viewport */}
      <div className="me-screen-viewport">
        {emulatorState === 'paused' ? (
          <div className="me-paused-overlay">
            <p>⏸ Giả lập tạm dừng</p>
            <button
              type="button"
              className="tt-btn-primary"
              onClick={() => setEmulatorState('running')}
            >
              Tiếp tục chơi
            </button>
          </div>
        ) : (
          <GameCanvas
            tab={tab}
            scaleMode={scaleMode}
            isReconnecting={isReconnecting}
            inputText={inputText}
            onClearInput={onClearInput}
            externalKeyAction={externalKeyAction}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="me-status-bar">
        <span className="status-item">
          <span className="status-dot green" /> Đang chạy: {jarMeta.midlet}
        </span>
        <span className="status-item">CLDC-1.0 / MIDP-2.0</span>
        <span className="status-item">FPS: 50</span>
      </div>
    </div>
  );
}
