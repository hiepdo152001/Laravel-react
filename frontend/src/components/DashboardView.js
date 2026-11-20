import React, { useState, useEffect, useRef } from 'react';
import {
  fetchTabs,
  createTab,
  toggleTab,
  restartTab,
  updateTab,
  deleteTab,
  fetchGames,
  uploadGameFile,
  deleteGameFile,
} from '../api/tabs';

export default function DashboardView({
  session,
  onLogout,
  onOpenScreen,
  darkMode,
  onToggleDarkMode,
}) {
  const [tabs, setTabs] = useState([]);
  const [summary, setSummary] = useState({
    total_slots: 2,
    used_slots: 2,
    running_count: 2,
    stopped_count: 0,
    rental_notice: '2 slot · slot gần nhất hết sau 10 ngày 20 giờ',
    balance: 0,
  });
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');

  // Tab creation form state
  const [tabName, setTabName] = useState('');
  const [selectedGame, setSelectedGame] = useState('Avatar_LAPRO.jar');
  const [emulator, setEmulator] = useState('MicroEmulator');
  const [tabCount, setTabCount] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab expanded event logs
  const [expandedEvents, setExpandedEvents] = useState({});

  // Rename modal
  const [renameModal, setRenameModal] = useState({ open: false, tab: null, newName: '' });

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Live timer tick to format tab uptimes
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [tabsData, gamesData] = await Promise.all([
        fetchTabs(session?.accessToken),
        fetchGames(session?.accessToken),
      ]);
      if (tabsData?.tabs) {
        setTabs(tabsData.tabs);
        if (tabsData.summary) setSummary(tabsData.summary);
      }
      if (gamesData?.games) {
        setGames(gamesData.games);
      }
    } catch (err) {
      setError('Không thể tải dữ liệu từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const handleCreateTab = async (e) => {
    e.preventDefault();
    if (!tabName.trim()) {
      showNotification('Vui lòng nhập tên tab');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createTab(
        {
          name: tabName.trim(),
          game_name: selectedGame,
          emulator,
          count: Number(tabCount) || 1,
        },
        session?.accessToken
      );

      if (res?.tabs) {
        setTabs((prev) => [...prev, ...res.tabs]);
        setSummary((prev) => ({
          ...prev,
          used_slots: prev.used_slots + res.tabs.length,
          running_count: prev.running_count + res.tabs.length,
          total_slots: Math.max(prev.total_slots, prev.used_slots + res.tabs.length),
        }));
        setTabName('');
        showNotification(`Đã tạo thành công ${res.tabs.length} tab!`);
      }
    } catch (err) {
      showNotification('Lỗi khi tạo tab mới');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTab = async (id) => {
    try {
      const res = await toggleTab(id, session?.accessToken);
      if (res?.tab) {
        setTabs((prev) => prev.map((t) => (t.id === id ? res.tab : t)));
        const isRunning = res.tab.status === 'running';
        setSummary((prev) => ({
          ...prev,
          running_count: prev.running_count + (isRunning ? 1 : -1),
          stopped_count: prev.stopped_count + (isRunning ? -1 : 1),
        }));
        showNotification(isRunning ? 'Đã bật tab' : 'Đã tắt tab');
      }
    } catch (err) {
      showNotification('Không thể thay đổi trạng thái tab');
    }
  };

  const handleRestartTab = async (id) => {
    try {
      const res = await restartTab(id, session?.accessToken);
      if (res?.tab) {
        setTabs((prev) => prev.map((t) => (t.id === id ? res.tab : t)));
        showNotification('Đã khởi động lại tab thành công');
      }
    } catch (err) {
      showNotification('Không thể khởi động lại tab');
    }
  };

  const handleDeleteTab = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xoá tab "${name}"?`)) return;
    try {
      await deleteTab(id, session?.accessToken);
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setSummary((prev) => ({
        ...prev,
        used_slots: Math.max(0, prev.used_slots - 1),
        running_count: Math.max(0, prev.running_count - 1),
      }));
      showNotification('Đã xoá tab');
    } catch (err) {
      showNotification('Không thể xoá tab');
    }
  };

  const handleOpenRename = (tab) => {
    setRenameModal({ open: true, tab, newName: tab.name });
  };

  const handleSaveRename = async () => {
    if (!renameModal.newName.trim() || !renameModal.tab) return;
    try {
      const res = await updateTab(
        renameModal.tab.id,
        { name: renameModal.newName.trim() },
        session?.accessToken
      );
      if (res?.tab) {
        setTabs((prev) => prev.map((t) => (t.id === renameModal.tab.id ? res.tab : t)));
        showNotification('Đã đổi tên tab thành công');
      }
    } catch (err) {
      showNotification('Lỗi khi đổi tên tab');
    } finally {
      setRenameModal({ open: false, tab: null, newName: '' });
    }
  };

  const toggleEventLog = (id) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // JAR File Upload Handler
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.jar')) {
      alert('Vui lòng chọn file có định dạng .jar!');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert('File vượt quá giới hạn 15MB!');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);
      const timer = setInterval(() => {
        setUploadProgress((p) => (p < 90 ? p + 20 : p));
      }, 150);

      const res = await uploadGameFile(file, session?.accessToken);
      clearInterval(timer);
      setUploadProgress(100);

      if (res?.game) {
        setGames((prev) => [...prev, res.game]);
        setSelectedGame(res.game.original_name);
        showNotification(`Đã tải lên game ${res.game.original_name} thành công!`);
      }
    } catch (err) {
      showNotification('Không thể tải file lên máy chủ');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleDeleteGame = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xoá file game này?')) return;
    try {
      await deleteGameFile(id, session?.accessToken);
      setGames((prev) => prev.filter((g) => g.id !== id));
      showNotification('Đã xoá file game');
    } catch (err) {
      showNotification('Lỗi khi xoá file');
    }
  };

  // Format running duration
  const getUptimeString = (startedAt, isRunning) => {
    if (!isRunning || !startedAt) return 'Đã tắt';
    const diff = Math.max(0, Math.floor((currentTime - new Date(startedAt).getTime()) / 1000));
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    const secs = diff % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m ${secs}s`;
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div className={`thuetab-app ${darkMode ? 'dark-mode' : ''}`}>
      {/* Top Main Navigation Bar */}
      <header className="tt-navbar">
        <div className="tt-nav-inner">
          <div className="tt-nav-left">
            <a href="#tab-cua-toi" className="tt-brand">
              <span className="tt-brand-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </span>
              <span className="tt-brand-name">thuetab</span>
            </a>

            <nav className="tt-nav-links">
              <button type="button" className="tt-nav-item active">
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
              Số dư <strong>{summary.balance} đ</strong>
            </span>
            <button type="button" className="tt-pill-btn">
              Zalo
            </button>
            <button type="button" className="tt-pill-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" strokeWidth="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
              </svg>
              App
            </button>
            <button
              type="button"
              className="tt-icon-btn"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button type="button" className="tt-pill-btn logout" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="tt-container">
        {error && (
          <div className="tt-toast danger" role="alert">
            {error}
          </div>
        )}
        {notification && (
          <div className="tt-toast" role="alert">
            {notification}
          </div>
        )}

        {/* 1. Summary Cards (4 Cards) */}
        <section className="tt-stats-grid">
          <div className="tt-stat-card">
            <span className="tt-stat-label">Tab đã thuê</span>
            <div className="tt-stat-val">
              {summary.used_slots} / {summary.total_slots}
            </div>
          </div>

          <div className="tt-stat-card">
            <span className="tt-stat-label">Đang chạy</span>
            <div className="tt-stat-val running-val">{summary.running_count}</div>
          </div>

          <div className="tt-stat-card">
            <span className="tt-stat-label">Đang tắt</span>
            <div className="tt-stat-val stopped-val">{summary.stopped_count}</div>
          </div>

          <div className="tt-stat-card rental-card">
            <span className="tt-stat-label">Hạn thuê</span>
            <div className="tt-rental-text">{summary.rental_notice}</div>
            <button type="button" className="tt-renew-btn">
              Gia hạn
            </button>
          </div>
        </section>

        {/* 2. Tab Creation Toolbar */}
        <section className="tt-create-section">
          <form className="tt-create-form" onSubmit={handleCreateTab}>
            <div className="tt-form-field">
              <input
                type="text"
                placeholder="Tên tab, ví dụ: Acc chính"
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                className="tt-input"
              />
            </div>

            <div className="tt-form-field">
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="tt-select"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.original_name}>
                    {g.display_name} {g.is_preset ? '' : '(Tải lên)'}
                  </option>
                ))}
              </select>
            </div>

            <div className="tt-form-field">
              <select
                value={emulator}
                onChange={(e) => setEmulator(e.target.value)}
                className="tt-select"
              >
                <option value="MicroEmulator">Giả lập: MicroEmulator</option>
                <option value="FreeJ2ME Web">Giả lập: FreeJ2ME Web</option>
                <option value="KEmulator">Giả lập: KEmulator v1.0.3</option>
              </select>
            </div>

            <div className="tt-form-field count-field">
              <span className="tt-label-inline">Số tab</span>
              <input
                type="number"
                min="1"
                max="5"
                value={tabCount}
                onChange={(e) => setTabCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="tt-input count-input"
              />
            </div>

            <button type="submit" className="tt-btn-create" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : '+ Tạo tab'}
            </button>
          </form>
        </section>

        {/* 3. Tab Cards Grid */}
        <section className="tt-tabs-section">
          {tabs.length === 0 && !loading && (
            <div className="tt-empty-tabs">
              <p>Bạn chưa có tab nào. Hãy nhập tên và bấm "+ Tạo tab" ở trên!</p>
            </div>
          )}

          <div className="tt-tabs-grid">
            {tabs.map((tab) => {
              const isRunning = tab.status === 'running';
              const isEventsOpen = expandedEvents[tab.id];

              return (
                <div key={tab.id} className={`tt-tab-card ${isRunning ? 'running' : 'stopped'}`}>
                  {/* Card Header */}
                  <div className="tt-card-header">
                    <h3 className="tt-card-title">{tab.name}</h3>
                    <span className={`tt-status-badge ${isRunning ? 'online' : 'offline'}`}>
                      <span className="tt-status-dot" />
                      {isRunning ? 'Đang chạy' : 'Đang tắt'}
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="tt-card-body">
                    <p className="tt-detail-line">
                      <span className="tt-label">Game:</span> {tab.game_name}
                    </p>
                    <p className="tt-detail-line">
                      <span className="tt-label">Giả lập:</span> {tab.emulator || 'MicroEmulator'}
                    </p>
                    <p className="tt-detail-line server-status">
                      <span className={`tt-small-dot ${isRunning ? 'green' : 'gray'}`} />
                      {isRunning ? tab.online_status || 'Đang online server game' : 'Ngắt kết nối máy chủ'}
                    </p>
                    <p className="tt-detail-line">
                      <span className="tt-label">Chế độ:</span> {tab.mode || 'Chạy nền (background)'}
                    </p>
                    <p className="tt-detail-line">
                      <span className="tt-label">Đã chạy:</span> {getUptimeString(tab.started_at, isRunning)} · FPS game: {isRunning ? tab.fps || 50 : 0}
                    </p>
                    <p className="tt-detail-line">
                      <span className="tt-label">Khởi động lại:</span> {tab.restart_count || 0}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="tt-card-actions">
                    <button
                      type="button"
                      className="tt-btn-primary"
                      onClick={() => onOpenScreen(tab)}
                      title="Mở màn hình điều khiển game"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                      </svg>
                      Mở màn hình
                    </button>

                    <button
                      type="button"
                      className="tt-btn-secondary"
                      onClick={() => handleToggleTab(tab.id)}
                    >
                      {isRunning ? 'Tắt' : 'Bật'}
                    </button>

                    <button
                      type="button"
                      className="tt-btn-secondary"
                      onClick={() => handleRestartTab(tab.id)}
                    >
                      Khởi động lại
                    </button>
                  </div>

                  {/* Secondary Actions */}
                  <div className="tt-card-subactions">
                    <button
                      type="button"
                      className="tt-btn-link"
                      onClick={() => handleOpenRename(tab)}
                    >
                      Đổi tên
                    </button>
                    <button
                      type="button"
                      className="tt-btn-link danger"
                      onClick={() => handleDeleteTab(tab.id, tab.name)}
                    >
                      Xoá
                    </button>
                  </div>

                  {/* Collapsible Event Log */}
                  <div className="tt-events-collapsible">
                    <button
                      type="button"
                      className="tt-events-toggle"
                      onClick={() => toggleEventLog(tab.id)}
                    >
                      <span className="arrow">{isEventsOpen ? '▼' : '▶'}</span> Lịch sử sự kiện
                    </button>

                    {isEventsOpen && (
                      <div className="tt-events-list">
                        {(tab.events || []).length === 0 ? (
                          <p className="tt-no-events">Chưa có sự kiện nào.</p>
                        ) : (
                          tab.events.map((evt, idx) => (
                            <div key={idx} className={`tt-event-item ${evt.type || 'info'}`}>
                              <span className="tt-event-time">{evt.time}</span>
                              <span className="tt-event-msg">{evt.message}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. "Game của tôi" Section (Upload .jar files) */}
        <section className="tt-mygames-section">
          <div className="tt-section-header">
            <h2 className="tt-section-title">Game của tôi</h2>
            <span className="tt-count-pill">
              {games.filter((g) => !g.is_preset).length} / 5 game
            </span>
          </div>

          <p className="tt-section-desc">
            Tải lên file JAR game J2ME bạn có quyền chơi; chỉ bạn thấy và dùng được game này. Mỗi file được quét trước khi chạy; kết quả được ghi lại.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".jar"
            onChange={(e) => handleFileUpload(e.target.files[0])}
          />

          <div
            className={`tt-dropzone ${isUploading ? 'uploading' : ''}`}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
          >
            <div className="tt-dropzone-inner">
              <svg className="tt-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth="2" />
                <polyline points="17 8 12 3 7 8" strokeWidth="2" />
                <line x1="12" y1="3" x2="12" y2="15" strokeWidth="2" />
              </svg>
              <p className="tt-dropzone-primary">
                {isUploading ? `Đang tải lên và quét file JAR (${uploadProgress}%)...` : 'Kéo file .jar vào đây hoặc bấm để chọn'}
              </p>
              <p className="tt-dropzone-sub">Tối đa 10 MB mỗi file · 5 game</p>
            </div>
          </div>

          {/* List of uploaded games */}
          {games.filter((g) => !g.is_preset).length > 0 && (
            <div className="tt-uploaded-games-list">
              {games
                .filter((g) => !g.is_preset)
                .map((g) => (
                  <div key={g.id} className="tt-uploaded-item">
                    <span className="tt-jar-icon">☕</span>
                    <div className="tt-jar-info">
                      <span className="tt-jar-name">{g.original_name}</span>
                      <span className="tt-jar-meta">
                        {(g.file_size / 1024).toFixed(1)} KB · Quét: An toàn 100%
                      </span>
                    </div>
                    <button
                      type="button"
                      className="tt-btn-delete-jar"
                      onClick={(e) => handleDeleteGame(g.id, e)}
                      title="Xoá file game"
                    >
                      ✕
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>

      {/* Rename Modal */}
      {renameModal.open && (
        <div className="tt-modal-overlay">
          <div className="tt-modal-card">
            <h3>Đổi tên tab</h3>
            <p className="tt-modal-desc">Nhập tên mới cho tab "{renameModal.tab?.name}":</p>
            <input
              type="text"
              value={renameModal.newName}
              onChange={(e) => setRenameModal((prev) => ({ ...prev, newName: e.target.value }))}
              className="tt-input"
              autoFocus
            />
            <div className="tt-modal-actions">
              <button
                type="button"
                className="tt-btn-secondary"
                onClick={() => setRenameModal({ open: false, tab: null, newName: '' })}
              >
                Hủy
              </button>
              <button type="button" className="tt-btn-primary" onClick={handleSaveRename}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
