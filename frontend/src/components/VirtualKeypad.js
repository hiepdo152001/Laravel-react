import React, { useState, useRef, useEffect } from 'react';

export default function VirtualKeypad({ onKeyPress }) {
  const [activeKey, setActiveKey] = useState(null);
  const holdIntervalRef = useRef(null);
  const holdTimeoutRef = useRef(null);

  const clearHold = () => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setActiveKey(null);
  };

  useEffect(() => {
    return () => clearHold();
  }, []);

  const handlePress = (action, label) => {
    setActiveKey(action);
    onKeyPress({ action, label, seq: Date.now() + Math.random() });
    setTimeout(() => {
      setActiveKey((curr) => (curr === action ? null : curr));
    }, 150);
  };

  // Fast continuous movement on press & hold for navigation buttons
  const startHold = (action, label) => {
    clearHold();
    handlePress(action, label);

    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => {
        onKeyPress({ action, label, seq: Date.now() + Math.random() });
      }, 80);
    }, 220);
  };

  const isKeyActive = (key) => activeKey === key;

  return (
    <div className="virtual-keypad-card">
      <h3 className="keypad-title">Bàn phím</h3>

      <div className="keypad-grid">
        {/* Row 1: L-Soft, Up, R-Soft */}
        <button
          type="button"
          className={`key-btn soft-btn ${isKeyActive('F1') ? 'active' : ''}`}
          onClick={() => handlePress('F1', 'L-Soft')}
          title="Phím mềm trái (F1 / Menu)"
        >
          <span className="key-main">L-Soft</span>
          <span className="key-sub">F1</span>
        </button>

        <button
          type="button"
          className={`key-btn nav-btn ${isKeyActive('UP') ? 'active' : ''}`}
          onMouseDown={() => startHold('UP', '▲')}
          onMouseUp={clearHold}
          onMouseLeave={clearHold}
          onTouchStart={() => startHold('UP', '▲')}
          onTouchEnd={clearHold}
          onTouchCancel={clearHold}
          title="Lên (Giữ để đi liên tục nhanh)"
        >
          <span className="key-icon">▲</span>
        </button>

        <button
          type="button"
          className={`key-btn soft-btn ${isKeyActive('F2') ? 'active' : ''}`}
          onClick={() => handlePress('F2', 'R-Soft')}
          title="Phím mềm phải (F2 / Xin chờ)"
        >
          <span className="key-main">R-Soft</span>
          <span className="key-sub">F2</span>
        </button>

        {/* Row 2: Left, OK / ENTER, Right */}
        <button
          type="button"
          className={`key-btn nav-btn ${isKeyActive('LEFT') ? 'active' : ''}`}
          onMouseDown={() => startHold('LEFT', '◀')}
          onMouseUp={clearHold}
          onMouseLeave={clearHold}
          onTouchStart={() => startHold('LEFT', '◀')}
          onTouchEnd={clearHold}
          onTouchCancel={clearHold}
          title="Trái (Giữ để đi liên tục nhanh)"
        >
          <span className="key-icon">◀</span>
        </button>

        <button
          type="button"
          className={`key-btn ok-btn ${isKeyActive('OK') ? 'active' : ''}`}
          onClick={() => handlePress('OK', 'OK/ENTER')}
          title="Chọn / Đồng ý (Enter / Phím 5)"
        >
          <span className="key-main">OK</span>
          <span className="key-sub">ENTER</span>
        </button>

        <button
          type="button"
          className={`key-btn nav-btn ${isKeyActive('RIGHT') ? 'active' : ''}`}
          onMouseDown={() => startHold('RIGHT', '▶')}
          onMouseUp={clearHold}
          onMouseLeave={clearHold}
          onTouchStart={() => startHold('RIGHT', '▶')}
          onTouchEnd={clearHold}
          onTouchCancel={clearHold}
          title="Phải (Giữ để đi liên tục nhanh)"
        >
          <span className="key-icon">▶</span>
        </button>

        {/* Row 3: C (XOÁ), Down */}
        <button
          type="button"
          className={`key-btn clear-btn ${isKeyActive('C') ? 'active' : ''}`}
          onClick={() => handlePress('C', 'C')}
          title="Xoá / Hủy (Backspace / C)"
        >
          <span className="key-main">C</span>
          <span className="key-sub">XOÁ</span>
        </button>

        <button
          type="button"
          className={`key-btn nav-btn ${isKeyActive('DOWN') ? 'active' : ''}`}
          onMouseDown={() => startHold('DOWN', '▼')}
          onMouseUp={clearHold}
          onMouseLeave={clearHold}
          onTouchStart={() => startHold('DOWN', '▼')}
          onTouchEnd={clearHold}
          onTouchCancel={clearHold}
          title="Xuống (Giữ để đi liên tục nhanh)"
        >
          <span className="key-icon">▼</span>
        </button>

        <div className="key-placeholder" aria-hidden="true" />

        {/* Numpad Rows: 1, 2, 3 */}
        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('1') ? 'active' : ''}`}
          onClick={() => handlePress('1', '1')}
        >
          <span className="key-main">1</span>
          <span className="key-sub">.?</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('2') ? 'active' : ''}`}
          onClick={() => handlePress('2', '2')}
        >
          <span className="key-main">2</span>
          <span className="key-sub">ABC</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('3') ? 'active' : ''}`}
          onClick={() => handlePress('3', '3')}
        >
          <span className="key-main">3</span>
          <span className="key-sub">DEF</span>
        </button>

        {/* Numpad Rows: 4, 5, 6 */}
        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('4') ? 'active' : ''}`}
          onClick={() => handlePress('4', '4')}
        >
          <span className="key-main">4</span>
          <span className="key-sub">GHI</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('5') ? 'active' : ''}`}
          onClick={() => handlePress('5', '5')}
        >
          <span className="key-main">5</span>
          <span className="key-sub">JKL</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('6') ? 'active' : ''}`}
          onClick={() => handlePress('6', '6')}
        >
          <span className="key-main">6</span>
          <span className="key-sub">MNO</span>
        </button>

        {/* Numpad Rows: 7, 8, 9 */}
        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('7') ? 'active' : ''}`}
          onClick={() => handlePress('7', '7')}
        >
          <span className="key-main">7</span>
          <span className="key-sub">PQRS</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('8') ? 'active' : ''}`}
          onClick={() => handlePress('8', '8')}
        >
          <span className="key-main">8</span>
          <span className="key-sub">TUV</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('9') ? 'active' : ''}`}
          onClick={() => handlePress('9', '9')}
        >
          <span className="key-main">9</span>
          <span className="key-sub">WXYZ</span>
        </button>

        {/* Numpad Rows: *, 0, # */}
        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('*') ? 'active' : ''}`}
          onClick={() => handlePress('*', '*')}
        >
          <span className="key-main">*</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('0') ? 'active' : ''}`}
          onClick={() => handlePress('0', '0')}
        >
          <span className="key-main">0</span>
          <span className="key-sub">␣</span>
        </button>

        <button
          type="button"
          className={`key-btn num-btn ${isKeyActive('#') ? 'active' : ''}`}
          onClick={() => handlePress('#', '#')}
        >
          <span className="key-main">#</span>
        </button>
      </div>

      <p className="keypad-hint">
        Mũi tên + Enter = OK · F1/F2 = phím mềm · 0-9 * # như phím điện thoại · chữ cái gõ thẳng vào game.
      </p>
    </div>
  );
}
