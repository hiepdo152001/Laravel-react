import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('renders the login form', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /đăng nhập vào mộc/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/địa chỉ email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument();
});

test('shows the required registration fields', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('tab', { name: /tạo tài khoản/i }));

  expect(screen.getByLabelText(/họ và tên/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/tên người dùng/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/ngày sinh/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/giới tính/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/xác nhận mật khẩu/i)).toBeInTheDocument();
});
