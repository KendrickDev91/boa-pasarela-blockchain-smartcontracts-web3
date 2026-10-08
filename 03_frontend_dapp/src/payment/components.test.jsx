// CF-07 a CF-09: componentes de estado del pago y primitivas de la interfaz
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { CountdownTimer, TxStatus, DetailRow } from './components.jsx';
import { Button } from '../components/primitives.jsx';

describe('Componentes del módulo de pago', () => {
  it('CF-07 el temporizador de la cotización descuenta y avisa al vencer', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    render(<CountdownTimer seconds={2} onExpire={onExpire} />);
    expect(screen.getByText('00:02')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('00:01')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });

    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('CF-08 el estado de la transacción distingue espera y confirmación', () => {
    const { rerender } = render(<TxStatus confirmations={2} required={5} />);
    expect(screen.getByText('Esperando confirmaciones')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();

    rerender(<TxStatus confirmations={5} required={5} />);
    expect(screen.getByText('Transacción confirmada')).toBeInTheDocument();
  });

  it('CF-09 el botón respeta el estado deshabilitado y la fila de detalle muestra el dato', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Pagar</Button>);
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<Button onClick={onClick} disabled>Pagar</Button>);
    fireEvent.click(screen.getByRole('button', { name: /Pagar/ }));
    expect(onClick).toHaveBeenCalledTimes(1);

    render(<DetailRow label="Monto" value="135.06 USDT" />);
    expect(screen.getByText('135.06 USDT')).toBeInTheDocument();
  });
});
