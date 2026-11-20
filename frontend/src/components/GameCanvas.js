import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playKeyTone, playMatchSound, playMenuSound } from '../utils/audio';

const COLS = 6;
const ROWS = 7;

// Gem definitions: colors & icon shapes
const GEM_TYPES = [
  { id: 0, name: 'blue-crystal', color: '#38bdf8', secondary: '#0284c7', label: '◆' },
  { id: 1, name: 'green-leaf', color: '#22c55e', secondary: '#15803d', label: '🌿' },
  { id: 2, name: 'yellow-star', color: '#facc15', secondary: '#ca8a04', label: '★' },
  { id: 3, name: 'red-heart', color: '#f43f5e', secondary: '#be123c', label: '♥' },
  { id: 4, name: 'purple-box', color: '#a855f7', secondary: '#7e22ce', label: '?' },
  { id: 5, name: 'blue-thunder', color: '#06b6d4', secondary: '#0e7490', label: '⚡' },
  { id: 6, name: 'brown-cross', color: '#d97706', secondary: '#92400e', label: '✖' },
];

function createRandomBoard() {
  const board = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(Math.floor(Math.random() * GEM_TYPES.length));
    }
    board.push(row);
  }
  return board;
}

export default function GameCanvas({
  tab,
  scaleMode = 'smooth', // 'smooth', 'pixel', 'scale2x', 'original'
  isReconnecting = false,
  inputText = null,
  onClearInput = () => {},
  onMenuToggle = () => {},
  externalKeyAction = null,
}) {
  const canvasRef = useRef(null);

  // Game internal state
  const [board, setBoard] = useState(createRandomBoard);
  const [cursor, setCursor] = useState({ col: 3, row: 1 });
  const [selectedGem, setSelectedGem] = useState(null);
  const [autoTreo, setAutoTreo] = useState(true);
  const [liteMode, setLiteMode] = useState(false);
  const [showInGameMenu, setShowInGameMenu] = useState(false);

  // Avatar stats
  const [xu, setXu] = useState(798697);
  const [kcx, setKcx] = useState(462);
  const [nhb] = useState(208);
  const [timerSeconds, setTimerSeconds] = useState(18);
  const [farmCountdown, setFarmCountdown] = useState(299); // 4m 59s
  const [speechBubble, setSpeechBubble] = useState('');

  // Particles & animations
  const particlesRef = useRef([]);
  const floatingTextsRef = useRef([]);
  const animFrameRef = useRef(null);

  // Live timer for Treo
  const [treoSeconds, setTreoSeconds] = useState(() => {
    // 1 day 17h 0m 34s in seconds
    return 1 * 86400 + 17 * 3600 + 34;
  });

  // Handle external text input (from "Gõ chữ" or "Dán")
  useEffect(() => {
    if (inputText) {
      setSpeechBubble(inputText);
      const timer = setTimeout(() => {
        setSpeechBubble('');
        onClearInput();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [inputText, onClearInput]);

  // Tick Treo timer, farm countdown, and move timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTreoSeconds((prev) => prev + 1);
      setFarmCountdown((prev) => (prev > 0 ? prev - 1 : 300));
      setTimerSeconds((prev) => (prev > 1 ? prev - 1 : 20));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format Treo time DD:HH:MM:SS
  const formatTreoTime = (totalSec) => {
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(days)}:${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  };

  const formatFarmTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Gem swap & match logic
  const checkAndClearMatches = useCallback((currentBoard) => {
    const matched = [];
    const newBoard = currentBoard.map((row) => [...row]);

    // Check rows
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const val = newBoard[r][c];
        if (val !== null && val === newBoard[r][c + 1] && val === newBoard[r][c + 2]) {
          matched.push({ r, c }, { r, c: c + 1 }, { r, c: c + 2 });
        }
      }
    }

    // Check columns
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const val = newBoard[r][c];
        if (val !== null && val === newBoard[r + 1][c] && val === newBoard[r + 2][c]) {
          matched.push({ r, c }, { r: r + 1, c }, { r: r + 2, c });
        }
      }
    }

    if (matched.length > 0) {
      // Remove duplicates
      const unique = Array.from(new Set(matched.map((m) => `${m.r},${m.c}`))).map((key) => {
        const [r, c] = key.split(',').map(Number);
        return { r, c };
      });

      // Spawn burst particles & floating text
      const earnedXu = unique.length * 150;
      setXu((x) => x + earnedXu);
      if (Math.random() > 0.4) setKcx((k) => k + 1);

      unique.forEach(({ r, c }) => {
        const gem = GEM_TYPES[newBoard[r][c]] || GEM_TYPES[0];
        // Create particles
        for (let i = 0; i < 6; i++) {
          particlesRef.current.push({
            x: 40 + c * 46 + 23,
            y: 110 + r * 38 + 19,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 1,
            color: gem.color,
            alpha: 1,
            size: Math.random() * 4 + 2,
          });
        }
        // Refill with random gem
        newBoard[r][c] = Math.floor(Math.random() * GEM_TYPES.length);
      });

      floatingTextsRef.current.push({
        text: `+${earnedXu} Xu`,
        x: 180 + (Math.random() - 0.5) * 40,
        y: 200,
        alpha: 1,
        color: '#fde047',
      });

      playMatchSound();
      setBoard(newBoard);
      return true;
    }
    return false;
  }, []);

  const swapGems = useCallback((r1, c1, r2, c2) => {
    setBoard((prev) => {
      const next = prev.map((row) => [...row]);
      const temp = next[r1][c1];
      next[r1][c1] = next[r2][c2];
      next[r2][c2] = temp;
      setTimeout(() => {
        checkAndClearMatches(next);
      }, 50);
      return next;
    });
    setSelectedGem(null);
  }, [checkAndClearMatches]);

  // Auto Bot loop: automatically moves and matches every 3.5 seconds
  useEffect(() => {
    if (!autoTreo) return;
    const botInterval = setInterval(() => {
      // Pick a random row and col, swap with adjacent
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * (COLS - 1));
      setCursor({ col: c, row: r });
      swapGems(r, c, r, c + 1);
    }, 3800);
    return () => clearInterval(botInterval);
  }, [autoTreo, swapGems]);

  // Keypad actions handler (from virtual keypad or physical keys)
  const handleKeyAction = useCallback((action) => {
    playKeyTone();

    if (showInGameMenu) {
      if (action === 'F2' || action === 'C' || action === 'CLEAR') {
        setShowInGameMenu(false);
        return;
      }
      if (action === '1') {
        setAutoTreo((v) => !v);
        setShowInGameMenu(false);
        return;
      }
      if (action === '2' || action === '3' || action === '4') {
        setSpeechBubble('Đang mở chức năng...');
        setTimeout(() => setSpeechBubble(''), 3000);
        setShowInGameMenu(false);
        return;
      }
    }

    switch (action) {
      case 'UP':
      case '2':
        setCursor((c) => ({ ...c, row: Math.max(0, c.row - 1) }));
        break;
      case 'DOWN':
      case '8':
        setCursor((c) => ({ ...c, row: Math.min(ROWS - 1, c.row + 1) }));
        break;
      case 'LEFT':
      case '4':
        setCursor((c) => ({ ...c, col: Math.max(0, c.col - 1) }));
        break;
      case 'RIGHT':
      case '6':
        setCursor((c) => ({ ...c, col: Math.min(COLS - 1, c.col + 1) }));
        break;
      case 'OK':
      case 'ENTER':
      case '5':
        if (!selectedGem) {
          setSelectedGem({ ...cursor });
        } else {
          // If clicked adjacent, swap
          const dist = Math.abs(selectedGem.row - cursor.row) + Math.abs(selectedGem.col - cursor.col);
          if (dist === 1) {
            swapGems(selectedGem.row, selectedGem.col, cursor.row, cursor.col);
          } else {
            setSelectedGem({ ...cursor });
          }
        }
        break;
      case 'F1':
      case 'MENU':
        playMenuSound();
        setShowInGameMenu((v) => !v);
        onMenuToggle();
        break;
      case 'F2':
        // Wait / Pass
        setSpeechBubble('Đang chờ đối thủ...');
        setTimeout(() => setSpeechBubble(''), 2500);
        break;
      case 'C':
      case 'CLEAR':
        setSelectedGem(null);
        break;
      case '7':
        setAutoTreo((v) => !v);
        break;
      case '9':
        setLiteMode((v) => !v);
        break;
      default:
        break;
    }
  }, [cursor, selectedGem, showInGameMenu, swapGems, onMenuToggle]);

  // Listen to externalKeyAction from parent keypad
  useEffect(() => {
    if (externalKeyAction) {
      handleKeyAction(externalKeyAction.action);
    }
  }, [externalKeyAction, handleKeyAction]);

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't capture when typing inside an input field
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          handleKeyAction('UP');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleKeyAction('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleKeyAction('LEFT');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleKeyAction('RIGHT');
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleKeyAction('OK');
          break;
        case 'F1':
          e.preventDefault();
          handleKeyAction('F1');
          break;
        case 'F2':
          e.preventDefault();
          handleKeyAction('F2');
          break;
        case 'Backspace':
        case 'Escape':
          e.preventDefault();
          handleKeyAction('C');
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
        case '*':
        case '#':
          e.preventDefault();
          handleKeyAction(e.key);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyAction]);

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;

    const width = 360;
    const height = 540;

    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // 1. Background dark stone wallpaper
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, width, height);

      // Subtle checkered pattern on board
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(20, 85, 320, 275);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if ((r + c) % 2 === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(26 + c * 51.5, 90 + r * 38, 51.5, 38);
          }
        }
      }

      // Ornamental border around the board
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 85, 320, 275);

      // 2. Top HUD banner (Avatar Character info)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.fillRect(0, 0, width, 82);

      // Info Texts
      ctx.font = 'bold 12px "Consolas", monospace, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`TK: ${tab?.name || 'akocui'}`, 12, 18);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Lv: 12 +2%`, 140, 18);

      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`Xu: ${xu.toLocaleString()}`, 12, 34);

      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`L: 0`, 140, 34);
      ctx.fillText(`LK: 68`, 175, 34);

      ctx.fillStyle = '#4ade80';
      ctx.fillText(`Treo: ${formatTreoTime(treoSeconds)}`, 12, 50);

      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Về Farm: ${formatFarmTime(farmCountdown)}`, 12, 66);

      // Gems KCX & NHB badges
      ctx.fillStyle = '#c084fc';
      ctx.fillText(`KCX: ${kcx}`, 140, 50);
      ctx.fillStyle = '#fb923c';
      ctx.fillText(`NHB: ${nhb}`, 140, 66);

      // Top-right toggles: Lite OFF & Tắt Auto
      // Button Lite
      ctx.fillStyle = liteMode ? 'rgba(74, 222, 128, 0.25)' : 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = liteMode ? '#4ade80' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.fillRect(250, 8, 96, 26);
      ctx.strokeRect(250, 8, 96, 26);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = liteMode ? '#4ade80' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(liteMode ? 'Lite ON' : 'Lite OFF', 298, 25);

      // Button Auto
      ctx.fillStyle = autoTreo ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = autoTreo ? '#a855f7' : '#94a3b8';
      ctx.fillRect(250, 42, 96, 28);
      ctx.strokeRect(250, 42, 96, 28);
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = autoTreo ? '#d8b4fe' : '#f8fafc';
      ctx.fillText(autoTreo ? 'Tắt Auto' : 'Bật Auto', 298, 60);
      ctx.textAlign = 'left';

      // 3. Gems rendering on board
      const startX = 26;
      const startY = 90;
      const cellW = 51.5;
      const cellH = 38;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const gemId = board[r]?.[c] ?? 0;
          const gem = GEM_TYPES[gemId] || GEM_TYPES[0];
          const cx = startX + c * cellW + cellW / 2;
          const cy = startY + r * cellH + cellH / 2;

          // Gem shape & gradient
          ctx.save();
          ctx.translate(cx, cy);

          // Subtle idle pulse
          const pulse = Math.sin((frame + r * 5 + c * 3) * 0.05) * 1.2;

          // Draw distinct gem based on id
          switch (gem.id) {
            case 0: // Blue Crystal / Diamond
              ctx.beginPath();
              ctx.moveTo(0, -12 - pulse);
              ctx.lineTo(12 + pulse, 0);
              ctx.lineTo(0, 12 + pulse);
              ctx.lineTo(-12 - pulse, 0);
              ctx.closePath();
              ctx.fillStyle = gem.color;
              ctx.fill();
              ctx.strokeStyle = '#e0f2fe';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              // Inner highlight
              ctx.fillStyle = 'rgba(255,255,255,0.6)';
              ctx.fillRect(-3, -7, 6, 6);
              break;

            case 1: // Green Leaf / Emerald
              ctx.beginPath();
              ctx.ellipse(0, 0, 11 + pulse, 13 + pulse, Math.PI / 4, 0, 2 * Math.PI);
              ctx.fillStyle = gem.color;
              ctx.fill();
              ctx.strokeStyle = '#bbf7d0';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              // Leaf vein
              ctx.strokeStyle = '#14532d';
              ctx.beginPath();
              ctx.moveTo(-6, -6);
              ctx.lineTo(6, 6);
              ctx.stroke();
              break;

            case 2: // Yellow Star / Sun Badge
              ctx.beginPath();
              for (let i = 0; i < 5; i++) {
                ctx.lineTo(
                  Math.cos(((18 + i * 72) * Math.PI) / 180) * (13 + pulse),
                  -Math.sin(((18 + i * 72) * Math.PI) / 180) * (13 + pulse)
                );
                ctx.lineTo(
                  Math.cos(((54 + i * 72) * Math.PI) / 180) * (6 + pulse / 2),
                  -Math.sin(((54 + i * 72) * Math.PI) / 180) * (6 + pulse / 2)
                );
              }
              ctx.closePath();
              ctx.fillStyle = gem.color;
              ctx.fill();
              ctx.strokeStyle = '#fef08a';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              break;

            case 3: // Red Heart
              ctx.beginPath();
              ctx.moveTo(0, 4);
              ctx.bezierCurveTo(-11, -7, -11, -14, 0, -8);
              ctx.bezierCurveTo(11, -14, 11, -7, 0, 4);
              ctx.fillStyle = gem.color;
              ctx.fill();
              ctx.strokeStyle = '#ffe4e6';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              break;

            case 4: // Purple Mystery Box
              ctx.fillStyle = gem.color;
              ctx.fillRect(-11 - pulse, -11 - pulse, 22 + pulse * 2, 22 + pulse * 2);
              ctx.strokeStyle = '#f3e8ff';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(-11 - pulse, -11 - pulse, 22 + pulse * 2, 22 + pulse * 2);
              ctx.font = 'bold 12px sans-serif';
              ctx.fillStyle = '#ffffff';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('?', 0, 0);
              break;

            case 5: // Blue Lightning Shield
              ctx.beginPath();
              ctx.moveTo(-11, -11);
              ctx.lineTo(11, -11);
              ctx.lineTo(9, 6);
              ctx.lineTo(0, 13);
              ctx.lineTo(-9, 6);
              ctx.closePath();
              ctx.fillStyle = gem.color;
              ctx.fill();
              ctx.strokeStyle = '#cffafe';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              // Lightning icon
              ctx.fillStyle = '#fef08a';
              ctx.font = 'bold 11px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('⚡', 0, 0);
              break;

            case 6: // Brown Bronze Cross
              ctx.fillStyle = gem.color;
              ctx.fillRect(-11, -11, 22, 22);
              ctx.strokeStyle = '#fde68a';
              ctx.lineWidth = 1.5;
              ctx.strokeRect(-11, -11, 22, 22);
              ctx.strokeStyle = '#451a03';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(-7, -7);
              ctx.lineTo(7, 7);
              ctx.moveTo(7, -7);
              ctx.lineTo(-7, 7);
              ctx.stroke();
              break;

            default:
              break;
          }
          ctx.restore();
        }
      }

      // 4. Cursor highlight [ ]
      const curX = startX + cursor.col * cellW;
      const curY = startY + cursor.row * cellH;
      const bracketLen = 8;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(curX + 2, curY + 2 + bracketLen);
      ctx.lineTo(curX + 2, curY + 2);
      ctx.lineTo(curX + 2 + bracketLen, curY + 2);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(curX + cellW - 2 - bracketLen, curY + 2);
      ctx.lineTo(curX + cellW - 2, curY + 2);
      ctx.lineTo(curX + cellW - 2, curY + 2 + bracketLen);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(curX + 2, curY + cellH - 2 - bracketLen);
      ctx.lineTo(curX + 2, curY + cellH - 2);
      ctx.lineTo(curX + 2 + bracketLen, curY + cellH - 2);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(curX + cellW - 2 - bracketLen, curY + cellH - 2);
      ctx.lineTo(curX + cellW - 2, curY + cellH - 2);
      ctx.lineTo(curX + cellW - 2, curY + cellH - 2 - bracketLen);
      ctx.stroke();

      // If selected gem, draw pulsing yellow border
      if (selectedGem) {
        const selX = startX + selectedGem.col * cellW;
        const selY = startY + selectedGem.row * cellH;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(selX + 3, selY + 3, cellW - 6, cellH - 6);
        ctx.setLineDash([]);
      }

      // 5. Timer countdown below board (big yellow number '18')
      ctx.font = '900 26px "Arial Black", sans-serif';
      ctx.fillStyle = '#eab308';
      ctx.textAlign = 'center';
      ctx.fillText(String(timerSeconds), width / 2, 388);
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 1;
      ctx.strokeText(String(timerSeconds), width / 2, 388);

      // 6. Characters battle bottom HUD
      // Player character (Left)
      const pX = 50;
      const pY = 445;

      // Draw avatar sprite representation (Hero with wings & weapon)
      // Wings
      ctx.fillStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.beginPath();
      ctx.ellipse(pX - 16, pY - 14, 18, 10, -Math.PI / 6, 0, Math.PI * 2);
      ctx.ellipse(pX + 16, pY - 14, 18, 10, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      // Body & Armor
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(pX - 10, pY - 10, 20, 22);
      // Head
      ctx.fillStyle = '#fde047'; // spiky blonde/gold hair
      ctx.beginPath();
      ctx.arc(pX, pY - 16, 9, 0, Math.PI * 2);
      ctx.fill();
      // Scythe / Weapon
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pX + 14, pY + 8);
      ctx.lineTo(pX + 14, pY - 26);
      ctx.arc(pX + 6, pY - 26, 8, 0, Math.PI, true);
      ctx.stroke();

      // Character name
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`${tab?.name || 'akocui'} DG`, 12, 420);

      // Player HP Bars
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(12, 432, 60, 8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(12, 432, 48, 8);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('820', 78, 440);

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(12, 444, 60, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(12, 444, 40, 8);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('290', 78, 452);

      ctx.fillStyle = '#fbbf24';
      ctx.fillText('0 XENG', 36, 468);

      // Opponent character (Right)
      const opX = 290;
      const opY = 445;

      // Opponent sprite
      ctx.fillStyle = '#b91c1c'; // Red horned devil
      ctx.beginPath();
      ctx.arc(opX, opY - 14, 10, 0, Math.PI * 2);
      ctx.fill();
      // Horns
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(opX - 8, opY - 22);
      ctx.lineTo(opX - 4, opY - 14);
      ctx.lineTo(opX - 12, opY - 16);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(opX + 8, opY - 22);
      ctx.lineTo(opX + 4, opY - 14);
      ctx.lineTo(opX + 12, opY - 16);
      ctx.fill();

      // Opponent HP Bars
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(240, 432, 60, 8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(240, 432, 28, 8);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('210', 305, 440);

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(240, 444, 60, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(240, 444, 25, 8);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText('160', 305, 452);

      ctx.fillStyle = '#fbbf24';
      ctx.fillText('323245 XENG', 230, 468);

      // 7. Speech bubble if active
      if (speechBubble) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        const bText = speechBubble.length > 28 ? speechBubble.slice(0, 28) + '...' : speechBubble;
        const bWidth = ctx.measureText(bText).width + 20;
        ctx.beginPath();
        ctx.roundRect(width / 2 - bWidth / 2, 400, bWidth, 26, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText(`💬 ${bText}`, width / 2, 417);
      }

      // 8. Bottom Softkeys Bar (Menu & Xin chờ)
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, height - 38, width, 38);

      ctx.font = 'bold 16px "Arial", sans-serif';
      ctx.fillStyle = '#f1f5f9';
      ctx.textAlign = 'left';
      ctx.fillText('Menu', 16, height - 14);

      ctx.textAlign = 'right';
      ctx.fillText('Xin chờ', width - 16, height - 14);

      // 9. Floating texts animation
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y -= 1.2;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = ft.alpha;
          ctx.font = '900 16px sans-serif';
          ctx.fillStyle = ft.color;
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }

      // 10. Particles animation
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 11. In-Game Menu overlay (when user presses Menu/F1)
      if (showInGameMenu) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#1e1b4b';
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2;
        ctx.roundRect(30, 110, 300, 260, 10);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#a5b4fc';
        ctx.textAlign = 'center';
        ctx.fillText('⚙ MENU TÙY CHỌN J2ME', width / 2, 140);

        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';

        const menuItems = [
          `1. Auto Treo Farm [${autoTreo ? 'ĐANG BẬT' : 'ĐÃ TẮT'}]`,
          `2. Chế độ hiển thị Lite [${liteMode ? 'BẬT' : 'TẮT'}]`,
          `3. Xem nông trại & kho nông sản`,
          `4. Chuyển khu / Đổi máy chủ`,
          `5. Đăng xuất tài khoản`,
        ];

        menuItems.forEach((item, idx) => {
          ctx.fillText(item, 50, 180 + idx * 32);
        });

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText('Bấm phím số 1-5 hoặc F2 để Đóng', width / 2, 350);
      }

      // 12. Reconnecting overlay
      if (isReconnecting) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('🔄 Đang kết nối lại tab game...', width / 2, height / 2 - 10);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Đang đồng bộ khung hình từ máy chủ', width / 2, height / 2 + 15);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [
    board,
    cursor,
    selectedGem,
    autoTreo,
    liteMode,
    showInGameMenu,
    isReconnecting,
    tab,
    xu,
    kcx,
    nhb,
    treoSeconds,
    farmCountdown,
    timerSeconds,
    speechBubble,
  ]);

  // Click on canvas directly
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 360 / rect.width;
    const scaleY = 540 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check click on Lite button
    if (x >= 250 && x <= 346 && y >= 8 && y <= 34) {
      setLiteMode((v) => !v);
      playKeyTone();
      return;
    }

    // Check click on Auto button
    if (x >= 250 && x <= 346 && y >= 42 && y <= 70) {
      setAutoTreo((v) => !v);
      playKeyTone();
      return;
    }

    // Check click on Menu softkey (bottom left)
    if (x <= 100 && y >= 500) {
      playMenuSound();
      setShowInGameMenu((v) => !v);
      return;
    }

    // Check click on Xin chờ softkey (bottom right)
    if (x >= 260 && y >= 500) {
      handleKeyAction('F2');
      return;
    }

    // Check click on board cells
    const startX = 26;
    const startY = 90;
    const cellW = 51.5;
    const cellH = 38;

    if (x >= startX && x <= startX + COLS * cellW && y >= startY && y <= startY + ROWS * cellH) {
      const col = Math.floor((x - startX) / cellW);
      const row = Math.floor((y - startY) / cellH);

      setCursor({ col, row });
      if (!selectedGem) {
        setSelectedGem({ col, row });
        playKeyTone();
      } else {
        const dist = Math.abs(selectedGem.row - row) + Math.abs(selectedGem.col - col);
        if (dist === 1) {
          swapGems(selectedGem.row, selectedGem.col, row, col);
        } else {
          setSelectedGem({ col, row });
          playKeyTone();
        }
      }
    }
  };

  const canvasStyle = {
    imageRendering: scaleMode === 'pixel' ? 'pixelated' : 'auto',
    maxWidth: '100%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
    borderRadius: '12px',
  };

  return (
    <div className="game-canvas-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
      <canvas
        ref={canvasRef}
        width={360}
        height={540}
        onClick={handleCanvasClick}
        style={canvasStyle}
        tabIndex={0}
        aria-label="Màn hình trò chơi Java J2ME"
      />
    </div>
  );
}
