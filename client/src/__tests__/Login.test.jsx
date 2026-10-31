import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from '../pages/Login.jsx';

const login = vi.fn();
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, loading: false, login }) }));
vi.mock('../services/endpoints.js', () => ({ authApi: { setupStatus: () => Promise.resolve({ data: { needsSetup: false } }) } }));

const setup = () => render(<MemoryRouter><Login /></MemoryRouter>);

describe('Login page', () => {
  beforeEach(() => login.mockReset());

  it('asks for both fields before calling the API', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your email and password/i);
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the server error message on failed login', async () => {
    login.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    setup();
    await userEvent.type(screen.getByLabelText(/work email/i), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass1');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password'));
  });
});
