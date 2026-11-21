import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from '@/app/auth/forgot-password/page';
import ResetPasswordPage from '@/app/auth/reset-password/page';
import AdminLoginPage from '@/app/admin/login/page';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock Supabase browser client
const mockResetPasswordForEmail = vi.fn();
const mockExchangeCodeForSession = vi.fn();
const mockSetSession = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      exchangeCodeForSession: mockExchangeCodeForSession,
      setSession: mockSetSession,
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
    },
    rpc: mockRpc,
  }),
}));

describe('Task AUTH-R1: Administrator Password Recovery Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe('1. Forgot Password Request Flow', () => {
    it('dispatches resetPasswordForEmail with exact redirectTo: ${origin}/auth/reset-password', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      render(React.createElement(ForgotPasswordPage));

      const input = screen.getByLabelText(/account email/i);
      fireEvent.change(input, { target: { value: 'admin@example.com' } });

      const submitBtn = screen.getByRole('button', { name: /send recovery link/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
          'admin@example.com',
          expect.objectContaining({
            redirectTo: expect.stringMatching(/\/auth\/reset-password$/),
          })
        );
      });

      // Verifies exact allowed redirect URL path
      const callArgs = mockResetPasswordForEmail.mock.calls[0];
      expect(callArgs[1].redirectTo).toContain('/auth/reset-password');
      expect(callArgs[1].redirectTo).not.toContain('/auth/confirm');
    });

    it('displays generic confirmation UI unconditionally to prevent account enumeration', async () => {
      mockResetPasswordForEmail.mockRejectedValue(new Error('User not found'));

      render(React.createElement(ForgotPasswordPage));

      const input = screen.getByLabelText(/account email/i);
      fireEvent.change(input, { target: { value: 'unknown@example.com' } });

      const submitBtn = screen.getByRole('button', { name: /send recovery link/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/recovery request received/i)).toBeDefined();
        expect(
          screen.getByText(/if an account exists with this email address/i)
        ).toBeDefined();
      });
    });
  });

  describe('2. Reset Password Landing & Code Exchange', () => {
    it('detects PKCE authorization code in search parameters and executes single exchange', async () => {
      mockSearchParams = new URLSearchParams('code=test_pkce_auth_code_123');
      mockExchangeCodeForSession.mockResolvedValue({
        data: { user: { email: 'admin@portfolio.dev' } },
        error: null,
      });

      render(React.createElement(ResetPasswordPage));

      await waitFor(() => {
        expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test_pkce_auth_code_123');
      });

      await waitFor(() => {
        expect(screen.getByText(/enter a new secure password for admin@portfolio\.dev/i)).toBeDefined();
        expect(screen.getByLabelText(/^new password/i)).toBeDefined();
      });
    });

    it('renders in-page error alert with recovery link when error_code=otp_expired is present', async () => {
      mockSearchParams = new URLSearchParams('error=access_denied&error_code=otp_expired');

      render(React.createElement(ResetPasswordPage));

      await waitFor(() => {
        expect(screen.getByText(/recovery link expired or invalid/i)).toBeDefined();
        expect(
          screen.getByText(/this password recovery link has expired or has already been used/i)
        ).toBeDefined();
        expect(screen.getByRole('link', { name: /request new reset link/i })).toBeDefined();
        expect(screen.getByRole('link', { name: /request new reset link/i }).getAttribute('href')).toBe('/auth/forgot-password');
      });

      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('renders in-page error alert when PKCE code exchange fails (e.g. opened in different browser)', async () => {
      mockSearchParams = new URLSearchParams('code=invalid_or_cross_browser_code');
      mockExchangeCodeForSession.mockResolvedValue({
        data: { user: null },
        error: { message: 'both auth code and code verifier should be non-empty' },
      });

      render(React.createElement(ResetPasswordPage));

      await waitFor(() => {
        expect(screen.getByText(/recovery link expired or invalid/i)).toBeDefined();
        expect(
          screen.getByText(/if you opened this link in a different browser than where it was requested/i)
        ).toBeDefined();
        expect(screen.getByRole('link', { name: /request new reset link/i })).toBeDefined();
      });
    });

    it('renders error state when user arrives at reset-password with no session and no code', async () => {
      mockSearchParams = new URLSearchParams('');
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      render(React.createElement(ResetPasswordPage));

      await waitFor(
        () => {
          expect(screen.getByText(/no active password recovery session was found/i)).toBeDefined();
        },
        { timeout: 1500 }
      );
    });
  });

  describe('3. Password Validation & Submission', () => {
    it('rejects password shorter than 12 characters and mismatched passwords', async () => {
      mockSearchParams = new URLSearchParams('code=valid_code');
      mockExchangeCodeForSession.mockResolvedValue({
        data: { user: { email: 'admin@portfolio.dev' } },
        error: null,
      });

      render(React.createElement(ResetPasswordPage));

      await waitFor(() => {
        expect(screen.getByLabelText(/^new password/i)).toBeDefined();
      });

      const passwordInput = screen.getByLabelText(/^new password/i);
      const confirmInput = screen.getByLabelText(/^confirm new password/i);
      const submitBtn = screen.getByRole('button', { name: /save new password/i });

      // Test 1: Under 12 chars
      fireEvent.change(passwordInput, { target: { value: 'short123' } });
      fireEvent.change(confirmInput, { target: { value: 'short123' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/new password must be at least 12 characters in length/i)
        ).toBeDefined();
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();

      // Test 2: Mismatched confirm password
      fireEvent.change(passwordInput, { target: { value: 'CorrectHorseBatteryStaple123!' } });
      fireEvent.change(confirmInput, { target: { value: 'DifferentPassword123!' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeDefined();
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('submits valid password (>= 12 chars) to updateUser and redirects to login with message', async () => {
      mockSearchParams = new URLSearchParams('code=valid_code');
      mockExchangeCodeForSession.mockResolvedValue({
        data: { user: { email: 'admin@portfolio.dev' } },
        error: null,
      });
      mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });

      render(React.createElement(ResetPasswordPage));

      await waitFor(() => {
        expect(screen.getByLabelText(/^new password/i)).toBeDefined();
      });

      const passwordInput = screen.getByLabelText(/^new password/i);
      const confirmInput = screen.getByLabelText(/^confirm new password/i);
      const submitBtn = screen.getByRole('button', { name: /save new password/i });

      const newPassword = 'VerySecureAdminPassword2026!';
      fireEvent.change(passwordInput, { target: { value: newPassword } });
      fireEvent.change(confirmInput, { target: { value: newPassword } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ password: newPassword });
        expect(mockPush).toHaveBeenCalledWith('/admin/login?message=password_updated');
      });
    });
  });

  describe('4. Login Page Confirmation Feedback', () => {
    it('displays green success alert when message=password_updated is present in searchParams', () => {
      mockSearchParams = new URLSearchParams('message=password_updated');

      render(React.createElement(AdminLoginPage));

      expect(
        screen.getByText(/password updated successfully\. please sign in with your new password\./i)
      ).toBeDefined();
    });

    it('renders standard login form without confirmation banner when message param is absent', () => {
      mockSearchParams = new URLSearchParams('');

      render(React.createElement(AdminLoginPage));

      expect(
        screen.queryByText(/password updated successfully/i)
      ).toBeNull();
    });
  });
});
