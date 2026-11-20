const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8001/api').replace(/\/+$/, '');
const STORAGE_KEY = 'thuetab.tabs.data';
const GAMES_STORAGE_KEY = 'thuetab.games.data';

const DEFAULT_GAMES = [
  {
    id: 'preset-avatar-lapro',
    original_name: 'Avatar_LAPRO.jar',
    display_name: 'Avatar LAPRO v2.9.3',
    file_size: 882039,
    status: 'ready',
    is_preset: true,
  },
  {
    id: 'preset-avatar-2',
    original_name: 'avatar-2-60c92e35d94f.jar',
    display_name: 'avatar-2',
    file_size: 737280, // ~720 KB
    status: 'ready',
    is_preset: true,
  },
  {
    id: 'preset-ninja-198',
    original_name: 'ninja-school-v198-auto.jar',
    display_name: 'ninja-198',
    file_size: 860160,
    status: 'ready',
    is_preset: true,
  },
  {
    id: 'preset-ngocrong',
    original_name: 'ngoc-rong-online-v230.jar',
    display_name: 'ngocrong-230',
    file_size: 1280000,
    status: 'ready',
    is_preset: true,
  },
];

const DEFAULT_TABS = [
  {
    id: 1,
    name: 'akocui',
    game_name: 'Avatar_LAPRO.jar',
    emulator: 'MicroEmulator',
    status: 'running',
    online_status: 'Đang online server game',
    mode: 'Chạy nền (background)',
    fps: 50,
    restart_count: 0,
    started_at: new Date(Date.now() - (1 * 86400 + 16 * 3600 + 58 * 60 + 55) * 1000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    events: [
      { time: '16:12:00 hôm qua', message: 'Tạo tab akocui thành công trên cụm máy chủ MicroEmulator J2ME', type: 'info' },
      { time: '16:12:03 hôm qua', message: 'Tải file Avatar_LAPRO.jar vào RAM MicroEmulator', type: 'info' },
      { time: '16:12:08 hôm qua', message: 'Kết nối TeaMobi Avatar Server (Port 19128) - Ping 12ms', type: 'success' },
      { time: '16:12:15 hôm qua', message: 'Đăng nhập tài khoản akocui thành công, kích hoạt auto treo farm', type: 'success' },
    ],
  },
  {
    id: 2,
    name: 'gikave',
    game_name: 'Avatar_LAPRO.jar',
    emulator: 'MicroEmulator',
    status: 'running',
    online_status: 'Đang online server game',
    mode: 'Chạy nền (background)',
    fps: 50,
    restart_count: 0,
    started_at: new Date(Date.now() - (21 * 3600 + 25 * 60 + 53) * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    events: [
      { time: '21:00:10 hôm qua', message: 'Tạo tab gikave thành công trên cụm máy chủ MicroEmulator J2ME', type: 'info' },
      { time: '21:00:15 hôm qua', message: 'Đang online server game - Chạy nền 24/7', type: 'success' },
    ],
  },
];

function getLocalTabs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return DEFAULT_TABS;
}

function saveLocalTabs(tabs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch (e) {
    // ignore
  }
}

function getLocalGames() {
  try {
    const raw = localStorage.getItem(GAMES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return DEFAULT_GAMES;
}

function saveLocalGames(games) {
  try {
    localStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
  } catch (e) {
    // ignore
  }
}

export async function fetchTabs(token) {
  try {
    const res = await fetch(`${API_URL}/tabs`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.tabs) {
        saveLocalTabs(data.tabs);
        return data;
      }
    }
  } catch (err) {
    // Backend offline: gracefully use local data
  }

  const local = getLocalTabs();
  return {
    status: 'success',
    summary: {
      total_slots: Math.max(2, local.length),
      used_slots: local.length,
      running_count: local.filter((t) => t.status === 'running').length,
      stopped_count: local.filter((t) => t.status === 'stopped').length,
      rental_notice: `${Math.max(2, local.length)} slot · slot gần nhất hết sau 10 ngày 20 giờ`,
      balance: 0,
    },
    tabs: local,
  };
}

export async function createTab(payload, token) {
  try {
    const res = await fetch(`${API_URL}/tabs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    // fallback
  }

  // Local fallback
  const tabs = getLocalTabs();
  const count = Number(payload.count) || 1;
  const newTabs = [];

  for (let i = 0; i < count; i++) {
    const name = count > 1 ? `${payload.name}-${i + 1}` : payload.name;
    const tab = {
      id: Date.now() + i,
      name,
      game_name: payload.game_name || 'Avatar_LAPRO.jar',
      emulator: payload.emulator || 'MicroEmulator',
      status: 'running',
      online_status: 'Đang online server game',
      mode: 'Chạy nền (background)',
      fps: 50,
      restart_count: 0,
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      events: [
        { time: new Date().toLocaleTimeString('vi-VN'), message: `Khởi tạo tab ${name}`, type: 'info' },
        { time: new Date().toLocaleTimeString('vi-VN'), message: `Tải game ${payload.game_name || 'Avatar_LAPRO.jar'}`, type: 'success' },
      ],
    };
    tabs.push(tab);
    newTabs.push(tab);
  }

  saveLocalTabs(tabs);
  return { status: 'success', tabs: newTabs };
}

export async function toggleTab(id, token) {
  try {
    const res = await fetch(`${API_URL}/tabs/${id}/toggle`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }

  const tabs = getLocalTabs();
  const index = tabs.findIndex((t) => t.id === id);
  if (index !== -1) {
    const nextStatus = tabs[index].status === 'running' ? 'stopped' : 'running';
    tabs[index].status = nextStatus;
    tabs[index].online_status = nextStatus === 'running' ? 'Đang online server game' : 'Ngắt kết nối máy chủ';
    if (nextStatus === 'running') {
      tabs[index].started_at = new Date().toISOString();
    }
    saveLocalTabs(tabs);
    return { status: 'success', tab: tabs[index] };
  }
  return { status: 'error' };
}

export async function restartTab(id, token) {
  try {
    const res = await fetch(`${API_URL}/tabs/${id}/restart`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }

  const tabs = getLocalTabs();
  const index = tabs.findIndex((t) => t.id === id);
  if (index !== -1) {
    tabs[index].status = 'running';
    tabs[index].restart_count = (tabs[index].restart_count || 0) + 1;
    tabs[index].started_at = new Date().toISOString();
    tabs[index].events = tabs[index].events || [];
    tabs[index].events.unshift({
      time: new Date().toLocaleTimeString('vi-VN'),
      message: 'Khởi động lại tiến trình giả lập',
      type: 'info',
    });
    saveLocalTabs(tabs);
    return { status: 'success', tab: tabs[index] };
  }
  return { status: 'error' };
}

export async function updateTab(id, data, token) {
  try {
    const res = await fetch(`${API_URL}/tabs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }

  const tabs = getLocalTabs();
  const index = tabs.findIndex((t) => t.id === id);
  if (index !== -1) {
    tabs[index] = { ...tabs[index], ...data };
    saveLocalTabs(tabs);
    return { status: 'success', tab: tabs[index] };
  }
  return { status: 'error' };
}

export async function deleteTab(id, token) {
  try {
    const res = await fetch(`${API_URL}/tabs/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }

  let tabs = getLocalTabs();
  tabs = tabs.filter((t) => t.id !== id);
  saveLocalTabs(tabs);
  return { status: 'success' };
}

export async function fetchGames(token) {
  try {
    const res = await fetch(`${API_URL}/games`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.games) {
        saveLocalGames(data.games);
        return data;
      }
    }
  } catch (err) {
    // fallback
  }

  const games = getLocalGames();
  const userCount = games.filter((g) => !g.is_preset).length;
  return {
    status: 'success',
    games,
    uploaded_count: userCount,
    max_allowed: 5,
  };
}

export async function uploadGameFile(file, token) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_URL}/games/upload`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }

  // Local fallback
  const games = getLocalGames();
  const cleanName = file.name.replace(/\.[^/.]+$/, '');
  const newGame = {
    id: 'user-' + Date.now(),
    original_name: file.name,
    display_name: cleanName,
    filename: file.name,
    file_size: file.size,
    status: 'ready',
    is_preset: false,
    fileBlob: file, // Keep file for in-browser JAR inspection
    created_at: new Date().toISOString(),
  };
  games.push(newGame);
  saveLocalGames(games);
  return { status: 'success', game: newGame };
}

export async function deleteGameFile(id, token) {
  try {
    const res = await fetch(`${API_URL}/games/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }

  let games = getLocalGames();
  games = games.filter((g) => g.id !== id);
  saveLocalGames(games);
  return { status: 'success' };
}

export function getTabScreenUrl(id) {
  return `${API_URL}/tabs/${id}/screen?t=${Date.now()}`;
}

export function getTabStreamUrl(id) {
  return `${API_URL}/tabs/${id}/stream`;
}

export async function sendTabKey(id, key, token) {
  try {
    const res = await fetch(`${API_URL}/tabs/${id}/key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ key }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }
  return { status: 'success' };
}

export async function sendTabText(id, text, token) {
  try {
    const res = await fetch(`${API_URL}/tabs/${id}/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }
  return { status: 'success' };
}

export async function sendTabClick(id, x, y, token) {
  try {
    const res = await fetch(`${API_URL}/tabs/${id}/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ x, y }),
    });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback
  }
  return { status: 'success' };
}
