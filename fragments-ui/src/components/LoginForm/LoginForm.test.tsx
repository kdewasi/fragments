import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('submits Basic Auth credentials', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} isLoading={false} error={null} />);

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: ' me@example.com ' } });
    fireEvent.change(screen.getByLabelText(/access key/i), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: /initialize session/i }));

    expect(onSubmit).toHaveBeenCalledWith({ username: 'me@example.com', password: 'secret' });
  });

  it('does not submit empty credentials', () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} isLoading={false} error={null} />);
    fireEvent.submit(screen.getByRole('button', { name: /initialize session/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows errors and disables the form while loading', () => {
    render(<LoginForm onSubmit={vi.fn()} isLoading={true} error="Invalid credentials" />);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders a redirect button in Cognito mode', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} isLoading={false} error={null} isCognito />);
    expect(screen.queryByLabelText(/access key/i)).not.toBeInTheDocument();
    fireEvent.submit(screen.getByRole('button', { name: /sign in with aws cognito/i }));
    expect(onSubmit).toHaveBeenCalledWith();
  });
});
