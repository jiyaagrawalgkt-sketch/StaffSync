import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ProtectedRoute from '../routes/ProtectedRoute.jsx';

let mockAuth = {};
vi.mock('../context/AuthContext.jsx', () => ({ useAuth: () => mockAuth }));

const renderAt = (roles) =>
  render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/unauthorized" element={<div>No access</div>} />
        <Route element={<ProtectedRoute roles={roles} />}><Route path="/secret" element={<div>Secret content</div>} /></Route>
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  it('redirects anonymous visitors to the login page', () => {
    mockAuth = { user: null, loading: false };
    renderAt();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('blocks users whose role is not allowed', () => {
    mockAuth = { user: { role: 'employee' }, loading: false };
    renderAt(['hr']);
    expect(screen.getByText('No access')).toBeInTheDocument();
  });

  it('shows the page to an allowed role', () => {
    mockAuth = { user: { role: 'hr' }, loading: false };
    renderAt(['hr']);
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });
});
