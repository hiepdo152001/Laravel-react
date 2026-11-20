import { useEffect, useState } from 'react';
import {
  clearSession,
  forgotPassword,
  getCurrentUser,
  login,
  readSession,
  register,
  resetPassword,
  storeSession,
  logout,
} from './api/auth';
import DashboardView from './components/DashboardView';
import LiveScreenView from './components/LiveScreenView';
import './App.css';

const initialRegistration = {
  name: '',
  user_name: '',
  email: '',
  phone: '',
  birth_day: '',
  gen: '',
  password: '',
  password_confirmation: '',
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <path d="M18 3.75 32.25 12v12L18 32.25 3.75 24V12L18 3.75Z" />
        <path d="m11.25 20.25 4.5 4.5 9-11.25" />
      </svg>
    </span>
  );
}

function Field({ id, label, error, className = '', ...inputProps }) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...inputProps}
      />
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

function PasswordField({ id, label, error, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={id === 'password_confirmation' ? 'new-password' : inputProps.autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          {...inputProps}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
      {error && (
        <span className="field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

function App() {
  const [mode, setMode] = useState(() => {
    const query = new URLSearchParams(window.location.search);
    return query.has('token') ? 'reset' : 'login';
  });
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [registration, setRegistration] = useState(initialRegistration);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get('email') || '');
  const resetToken = new URLSearchParams(window.location.search).get('token') || '';

  useEffect(() => {
    let active = true;
    const savedSession = readSession();

    if (!savedSession?.accessToken) {
      setReady(true);
      return () => {
        active = false;
      };
    }

    getCurrentUser(savedSession.accessToken)
      .then((user) => {
        if (active) {
          const restoredSession = { ...savedSession, user };
          storeSession(restoredSession);
          setSession(restoredSession);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) {
          clearSession();
        } else {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage('');
    setError('');
    setFieldErrors({});
  }

  function updateRegistration(event) {
    const { name, value } = event.target;
    setRegistration((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    try {
      if (mode === 'forgot') {
        const response = await forgotPassword({ email: formData.get('email') });
        setMessage(response.message);
        return;
      }

      if (mode === 'reset') {
        const response = await resetPassword({
          token: resetToken,
          email: formData.get('email'),
          password: formData.get('password'),
          password_confirmation: formData.get('password_confirmation'),
        });
        window.history.replaceState({}, '', window.location.pathname);
        changeMode('login');
        setMessage(response.message);
        return;
      }

      const credentials =
        mode === 'register'
          ? {
              ...registration,
              my_name: '',
            }
          : {
              email: formData.get('email'),
              password: formData.get('password'),
            };
      const result = mode === 'register' ? await register(credentials) : await login(credentials);
      const newSession = {
        accessToken: result.access_token,
        user: result.user,
      };
      storeSession(newSession);
      setSession(newSession);
    } catch (requestError) {
      setError(requestError.message);
      setFieldErrors(requestError.fields || {});
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setError('');

    try {
      await logout(session.accessToken);
      setMessage('Bạn đã đăng xuất an toàn.');
    } catch {
      setMessage('Đã xóa phiên trên thiết bị, nhưng chưa thể thu hồi phiên trên máy chủ.');
    } finally {
      clearSession();
      setSession(null);
      setLoading(false);
    }
  }

  const [activeTabScreen, setActiveTabScreen] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  if (!ready) {
    return (
      <main className="loading-screen" aria-live="polite">
        <span className="loader" />
        <span>Đang kiểm tra phiên đăng nhập…</span>
      </main>
    );
  }

  if (session) {
    if (activeTabScreen) {
      return (
        <LiveScreenView
          tab={activeTabScreen}
          session={session}
          onBack={() => setActiveTabScreen(null)}
          onLogout={handleLogout}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        />
      );
    }

    return (
      <DashboardView
        session={session}
        onLogout={handleLogout}
        onOpenScreen={(tab) => setActiveTabScreen(tab)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />
    );
  }

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';

  return (
    <main className="auth-shell">
      <aside className="welcome-panel">
        <a className="brand" href="/" aria-label="Mộc — trang chủ">
          <BrandMark />
          <span>mộc<span className="brand-period">.</span></span>
        </a>

        <div className="welcome-copy">
          <p className="eyebrow">MỘT KHÔNG GIAN CỦA RIÊNG BẠN</p>
          <h1>
            Bắt đầu từ
            <br />
            những điều <em>nhỏ bé.</em>
          </h1>
          <p className="welcome-description">
            Một nơi để bạn lưu giữ những ý tưởng, kết nối với cộng đồng và tạo nên điều gì đó thật
            ý nghĩa.
          </p>
        </div>

        <div className="welcome-footer">
          <div className="avatar-stack" aria-hidden="true">
            <span>H</span>
            <span>M</span>
            <span>A</span>
            <span>+</span>
          </div>
          <p>
            <strong>Cộng đồng đang chờ bạn</strong>
            <span>Cùng nhau tạo nên những điều tốt đẹp.</span>
          </p>
        </div>
        <div className="decorative-orbit orbit-one" aria-hidden="true" />
        <div className="decorative-orbit orbit-two" aria-hidden="true" />
      </aside>

      <section className="form-panel">
        <div className="mobile-brand">
          <BrandMark />
          <span>mộc<span className="brand-period">.</span></span>
        </div>

        <div className={`auth-card ${isRegister ? 'register-card' : ''}`}>
          {!isForgot && !isReset && (
            <div className="auth-tabs" role="tablist" aria-label="Chọn hình thức xác thực">
              <button
                className={!isRegister ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={!isRegister}
                onClick={() => changeMode('login')}
              >
                Đăng nhập
              </button>
              <button
                className={isRegister ? 'active' : ''}
                type="button"
                role="tab"
                aria-selected={isRegister}
                onClick={() => changeMode('register')}
              >
                Tạo tài khoản
              </button>
            </div>
          )}

          <div className="form-heading">
            <p className="eyebrow">{isRegister ? 'CHÀO MỪNG BẠN ĐẾN VỚI MỘC' : 'RẤT VUI ĐƯỢC GẶP LẠI'}</p>
            <h2>
              {isRegister && 'Tạo tài khoản mới'}
              {mode === 'login' && 'Đăng nhập vào Mộc'}
              {isForgot && 'Khôi phục mật khẩu'}
              {isReset && 'Đặt mật khẩu mới'}
            </h2>
            <p>
              {isRegister && 'Chỉ mất một phút để bắt đầu hành trình của bạn.'}
              {mode === 'login' && 'Nhập thông tin để tiếp tục hành trình của bạn.'}
              {isForgot && 'Chúng tôi sẽ gửi cho bạn hướng dẫn qua email.'}
              {isReset && 'Hãy chọn một mật khẩu mới và an toàn.'}
            </p>
          </div>

          {error && <div className="notice error" role="alert">{error}</div>}
          {message && <div className="notice success" role="status">{message}</div>}

          <form onSubmit={handleSubmit} noValidate={false}>
            {isRegister && (
              <>
                <div className="field-row">
                  <Field
                    id="name"
                    label="Họ và tên"
                    placeholder="Nguyễn Minh Anh"
                    autoComplete="name"
                    maxLength="255"
                    required
                    value={registration.name}
                    onChange={updateRegistration}
                    error={fieldErrors.name}
                  />
                  <Field
                    id="user_name"
                    label="Tên người dùng"
                    placeholder="minhanh"
                    autoComplete="username"
                    maxLength="50"
                    required
                    value={registration.user_name}
                    onChange={updateRegistration}
                    error={fieldErrors.user_name}
                  />
                </div>
                <Field
                  id="email"
                  label="Địa chỉ email"
                  type="email"
                  placeholder="ban@email.com"
                  autoComplete="email"
                  maxLength="255"
                  required
                  value={registration.email}
                  onChange={updateRegistration}
                  error={fieldErrors.email}
                />
                <div className="field-row">
                  <Field
                    id="phone"
                    label="Số điện thoại"
                    type="tel"
                    placeholder="0912 345 678"
                    autoComplete="tel"
                    minLength="10"
                    maxLength="15"
                    required
                    value={registration.phone}
                    onChange={updateRegistration}
                    error={fieldErrors.phone}
                  />
                  <Field
                    id="birth_day"
                    label="Ngày sinh"
                    type="date"
                    autoComplete="bday"
                    required
                    value={registration.birth_day}
                    onChange={updateRegistration}
                    error={fieldErrors.birth_day}
                  />
                </div>
                <div className="field">
                  <label htmlFor="gen">Giới tính</label>
                  <select
                    id="gen"
                    name="gen"
                    required
                    value={registration.gen}
                    onChange={updateRegistration}
                    aria-invalid={Boolean(fieldErrors.gen)}
                    aria-describedby={fieldErrors.gen ? 'gen-error' : undefined}
                  >
                    <option value="" disabled>Chọn giới tính</option>
                    <option value="female">Nữ</option>
                    <option value="male">Nam</option>
                    <option value="other">Khác</option>
                  </select>
                  {fieldErrors.gen && <span className="field-error" id="gen-error">{fieldErrors.gen}</span>}
                </div>
              </>
            )}

            {(mode === 'login' || isForgot || isReset) && (
              <Field
                id="email"
                label="Địa chỉ email"
                type="email"
                placeholder="ban@email.com"
                autoComplete="email"
                maxLength="255"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={fieldErrors.email}
              />
            )}

            {(mode === 'login' || isRegister || isReset) && (
              <PasswordField
                id="password"
                label={isReset ? 'Mật khẩu mới' : 'Mật khẩu'}
                placeholder={isRegister || isReset ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu của bạn'}
                autoComplete={isRegister || isReset ? 'new-password' : 'current-password'}
                minLength="8"
                required
                value={isRegister ? registration.password : password}
                onChange={isRegister ? updateRegistration : (event) => setPassword(event.target.value)}
                error={fieldErrors.password}
              />
            )}

            {(isRegister || isReset) && (
              <PasswordField
                id="password_confirmation"
                label="Xác nhận mật khẩu"
                placeholder="Nhập lại mật khẩu"
                minLength="8"
                required
                value={isRegister ? registration.password_confirmation : undefined}
                onChange={isRegister ? updateRegistration : undefined}
                error={fieldErrors.password_confirmation}
              />
            )}

            {mode === 'login' && (
              <div className="form-options">
                <span className="secure-note">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3 7h10v7H3z" />
                  </svg>
                  Kết nối an toàn
                </span>
                <button className="text-button" type="button" onClick={() => changeMode('forgot')}>
                  Quên mật khẩu?
                </button>
              </div>
            )}

            <button className="button button-primary full-width" type="submit" disabled={loading}>
              {loading
                ? 'Đang xử lý…'
                : isRegister
                  ? 'Tạo tài khoản'
                  : isForgot
                    ? 'Gửi hướng dẫn'
                    : isReset
                      ? 'Cập nhật mật khẩu'
                      : 'Đăng nhập'}
              {!loading && <span aria-hidden="true">↗</span>}
            </button>

            {mode === 'login' && (
              <>
                <div className="demo-experience-divider">
                  <span>hoặc trải nghiệm ngay</span>
                </div>
                <button
                  type="button"
                  className="button button-demo full-width"
                  onClick={() => {
                    const demoSession = {
                      accessToken: null,
                      user: { name: 'akocui', user_name: 'akocui', email: 'akocui@thuetab.com' },
                    };
                    storeSession(demoSession);
                    setSession(demoSession);
                  }}
                >
                  ⚡ Vào thẳng giao diện thuetab (Dùng thử ngay)
                </button>
              </>
            )}
          </form>

          {(isForgot || isReset) && (
            <button className="back-link" type="button" onClick={() => changeMode('login')}>
              ← Quay lại đăng nhập
            </button>
          )}
        </div>
        <p className="form-legal">Bằng việc tiếp tục, bạn đồng ý với các điều khoản sử dụng của chúng tôi.</p>
      </section>
    </main>
  );
}

export default App;
