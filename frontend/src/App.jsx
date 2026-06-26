import { Routes, Route, Navigate } from 'react-router-dom';
import BookingApp from './booking/BookingApp.jsx';
import AdminApp from './admin/AdminApp.jsx';
import PaymentGateway from './components/PaymentGateway';
import MockPolygonScan from './explorer/MockPolygonScan';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BookingApp />} />
      <Route path="/admin" element={<AdminApp />} />
      <Route path="/pago-directo" element={<PaymentGateway />} />
      <Route path="/explorer/tx/:hash" element={<MockPolygonScan />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
