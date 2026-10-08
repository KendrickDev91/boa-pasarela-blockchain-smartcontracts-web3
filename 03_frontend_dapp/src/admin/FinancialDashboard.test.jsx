// CF-10 y CF-11: acceso al panel de conciliación del Personal de Finanzas
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminLogin } from './FinancialDashboard.jsx';
import { API_BASE } from '../services/config.js';

const llenar = (usuario, clave) => {
  const [u, p] = document.querySelectorAll('input');
  fireEvent.change(u, { target: { value: usuario } });
  fireEvent.change(p, { target: { value: clave } });
  fireEvent.click(screen.getByRole('button', { name: /Autorizar Acceso/ }));
};

describe('Inicio de sesión del panel de conciliación', () => {
  it('CF-10 guarda el token JWT y habilita el panel con credenciales válidas', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: true, token: 'jwt.de.prueba' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const onLoginSuccess = vi.fn();
    render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

    llenar('finanzas', 'clave-de-prueba');

    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/payments/login`);
    expect(localStorage.getItem('boa_admin_token')).toBe('jwt.de.prueba');
  });

  it('CF-11 muestra el rechazo del servidor y no guarda token', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ success: false, message: 'Credenciales inválidas' }) })));
    const onLoginSuccess = vi.fn();
    render(<AdminLogin onLoginSuccess={onLoginSuccess} />);

    llenar('finanzas', 'incorrecta');

    expect(await screen.findByText(/Credenciales inválidas/)).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem('boa_admin_token')).toBeNull();
  });
});
