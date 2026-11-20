import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardView from './components/DashboardView';
import LiveScreenView from './components/LiveScreenView';
import VirtualKeypad from './components/VirtualKeypad';

describe('Thuetab Dashboard and Live Screen', () => {
  const mockSession = {
    accessToken: 'test-token',
    user: { name: 'akocui', user_name: 'akocui', email: 'akocui@thuetab.com' },
  };

  const sampleTab = {
    id: 1,
    name: 'akocui',
    game_name: 'Avatar_LAPRO.jar',
    emulator: 'MicroEmulator',
    status: 'running',
    online_status: 'Đang online server game',
    mode: 'Chạy nền (background)',
    fps: 50,
    restart_count: 0,
    started_at: new Date().toISOString(),
    events: [],
  };

  test('renders dashboard statistics and creation bar correctly', async () => {
    const onOpenScreen = jest.fn();
    render(
      <DashboardView
        session={mockSession}
        onLogout={jest.fn()}
        onOpenScreen={onOpenScreen}
        darkMode={false}
        onToggleDarkMode={jest.fn()}
      />
    );

    // Summary stats
    expect(screen.getByText('Tab đã thuê')).toBeInTheDocument();
    expect(screen.getByText('Đang chạy')).toBeInTheDocument();
    expect(screen.getByText('Đang tắt')).toBeInTheDocument();
    expect(screen.getByText('Hạn thuê')).toBeInTheDocument();

    // Create tab form
    expect(screen.getByPlaceholderText(/Tên tab, ví dụ: Acc chính/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Tạo tab/i })).toBeInTheDocument();

    // "Game của tôi" upload section
    expect(screen.getByText('Game của tôi')).toBeInTheDocument();
    expect(screen.getByText(/Kéo file \.jar vào đây hoặc bấm để chọn/i)).toBeInTheDocument();
  });

  test('renders existing tab card and triggers onOpenScreen when clicking Mở màn hình', async () => {
    const onOpenScreen = jest.fn();
    render(
      <DashboardView
        session={mockSession}
        onLogout={jest.fn()}
        onOpenScreen={onOpenScreen}
        darkMode={false}
        onToggleDarkMode={jest.fn()}
      />
    );

    // Find "Mở màn hình" button and click it
    await waitFor(() => {
      const openScreenButtons = screen.getAllByRole('button', { name: /Mở màn hình/i });
      expect(openScreenButtons.length).toBeGreaterThan(0);
      fireEvent.click(openScreenButtons[0]);
      expect(onOpenScreen).toHaveBeenCalled();
    });
  });

  test('renders live screen view with J2ME viewport, keypad, and status stats', () => {
    const onBack = jest.fn();
    render(
      <LiveScreenView
        tab={sampleTab}
        allTabs={[sampleTab]}
        session={mockSession}
        onBack={onBack}
        onLogout={jest.fn()}
        darkMode={false}
        onToggleDarkMode={jest.fn()}
      />
    );

    // Breadcrumb and live title
    expect(screen.getByText(/Tab giả lập > Avatar_LAPRO\.jar/i)).toBeInTheDocument();
    expect(screen.getByText('TRỰC TIẾP')).toBeInTheDocument();

    // Status Panel
    expect(screen.getByRole('heading', { name: 'Trạng thái' })).toBeInTheDocument();
    expect(screen.getByText('FPS game')).toBeInTheDocument();
    expect(screen.getByText('Độ trễ')).toBeInTheDocument();
    expect(screen.getByText('Băng thông')).toBeInTheDocument();

    // Real emulator screen notice
    expect(
      screen.getByText(/Hình ảnh thực tế đang được render trực tiếp từ file JAR/i)
    ).toBeInTheDocument();

    // Virtual keypad buttons
    expect(screen.getByText('L-Soft')).toBeInTheDocument();
    expect(screen.getByText('R-Soft')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('ABC')).toBeInTheDocument();

    // Mode switcher to MicroEmulator Window
    const emulatorModeBtn = screen.getByRole('button', { name: /Khung MicroEmulator/i });
    expect(emulatorModeBtn).toBeInTheDocument();
    fireEvent.click(emulatorModeBtn);
    expect(screen.getByText(/MicroEmulator 2\.0\.4/i)).toBeInTheDocument();

    // Back button triggers onBack
    const backBtn = screen.getByRole('button', { name: /Quay lại/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalled();
  });

  test('virtual keypad triggers keypress events correctly', () => {
    const onKeyPress = jest.fn();
    render(<VirtualKeypad onKeyPress={onKeyPress} />);

    // Click OK button
    const okBtn = screen.getByTitle(/Chọn \/ Đồng ý/i);
    fireEvent.click(okBtn);
    expect(onKeyPress).toHaveBeenCalledWith(expect.objectContaining({ action: 'OK' }));

    // Click L-Soft
    const softBtn = screen.getByTitle(/Phím mềm trái/i);
    fireEvent.click(softBtn);
    expect(onKeyPress).toHaveBeenCalledWith(expect.objectContaining({ action: 'F1' }));
  });
});
