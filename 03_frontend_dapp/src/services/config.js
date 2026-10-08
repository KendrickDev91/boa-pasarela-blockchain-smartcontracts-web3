// URL base del servidor intermedio. En producción (detrás de Apache) se usa la ruta relativa /api.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
