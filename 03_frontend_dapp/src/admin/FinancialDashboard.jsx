import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import boaLogo from '../assets/boa-logo.png';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const pad = n => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const AdminLogin = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('http://localhost:3000/api/payments/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('boa_admin_token', data.token);
                onLoginSuccess();
            } else {
                setError(data.message || 'Credenciales inválidas');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
                <div className="text-center mb-8">
                    <img src={boaLogo} alt="BoA Logo" className="h-12 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-[#00306F]">Acceso Restringido</h2>
                    <p className="text-sm text-gray-500 mt-2">Departamento de Conciliación Financiera (Web3)</p>
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 font-medium border border-red-100">
                        <i className="ri-error-warning-fill"></i> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Usuario corporativo</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00306F] outline-none transition-all"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                        <input 
                            type="password" 
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00306F] outline-none transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-[#00306F] text-white font-bold p-3 rounded-lg hover:bg-[#002250] transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-lock-unlock-line"></i>}
                        Autorizar Acceso
                    </button>
                </form>
            </div>
        </div>
    );
};

export const FinancialDashboard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('boa_admin_token'));
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    
    // Filtros de fecha obligatorios (Requiere inicio y fin)
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const ITEMS_PER_PAGE = 9;

    const fetchTransactions = async () => {
        if (!startDate || !endDate) {
            setError('Debe seleccionar las fechas de inicio y fin para el reporte.');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            setError('La fecha de inicio no puede ser mayor a la fecha de fin.');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('boa_admin_token');
            const response = await fetch(`http://localhost:3000/api/payments/all?startDate=${startDate}&endDate=${endDate} 23:59:59`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();

            if (result.success) {
                setTransactions(result.data);
            } else {
                if (response.status === 401) {
                    localStorage.removeItem('boa_admin_token');
                    setIsAuthenticated(false);
                }
                setError(result.message || 'Error al cargar los datos financieros');
            }
        } catch (error) {
            console.error('Error obteniendo el listado de transacciones:', error);
            setError('No se pudo establecer conexión con el orquestador backend.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('boa_admin_token');
        setIsAuthenticated(false);
    };



    const exportCSV = () => {
        const headers = ['PNR', 'Hash (Polygon)', 'Monto USDT', 'Tipo Cambio', 'Fecha', 'Estado'];
        const csvContent = [
            headers.join(','),
            ...transactions.map(t =>
                `${t.pnr},${t.tx_hash || 'N/A'},${t.monto_usdt},${t.tipo_cambio || 'N/A'},${formatDate(t.fecha_pago)},${t.tx_hash ? 'Confirmada' : 'Pendiente'}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `auditoria_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPDF = async () => {
        if (transactions.length === 0) return;
        const doc = new jsPDF();
        
        const img = new Image();
        img.src = boaLogo;
        await new Promise(r => { img.onload = r; });

        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, 210, 40, 'F');
        doc.addImage(img, 'PNG', 14, 12, 35, 12);

        doc.setFontSize(16);
        doc.setTextColor(0, 48, 111);
        doc.setFont("helvetica", "bold");
        doc.text("Auditoría de Conciliación Financiera", 14, 32);
        
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "normal");
        const now = new Date();
        doc.text(`Periodo Reportado: ${startDate} al ${endDate}`, 196, 12, { align: 'right' });
        doc.text(`Fecha Emisión: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 196, 17, { align: 'right' });
        doc.text(`Folio: FOLIO-${now.getTime().toString().slice(-6)}`, 196, 22, { align: 'right' });
        doc.text(`Operador: ADMIN-WEB3`, 196, 27, { align: 'right' });

        const tableColumn = ["PNR", "Hash (Polygon)", "Monto USDT", "T.C. (Bs)", "Fecha", "Estado"];
        const tableRows = transactions.map(t => [
            t.pnr,
            t.tx_hash ? t.tx_hash.substring(0, 16) + '...' : 'N/A',
            t.monto_usdt,
            t.tipo_cambio || '10.00',
            formatDate(t.fecha_pago),
            t.tx_hash ? 'Confirmada' : 'Pendiente'
        ]);

        autoTable(doc, {
            head: [tableColumn], body: tableRows, startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [0, 48, 111], textColor: 255, fontStyle: 'bold' },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 9 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.1 },
            margin: { bottom: 30 }
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text("Documento generado por el Motor de Orquestación Web3", 14, 285);
            doc.text(`Página ${i} de ${pageCount}`, 196, 285, { align: 'right' });
        }

        doc.save(`auditoria_financiera_${startDate}_al_${endDate}.pdf`);
    };

    const paginated = transactions.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-4 border-gray-200 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Panel de Conciliación Financiera</h2>
                    <p className="text-gray-500 mt-1">Gestión y auditoría de cobros descentralizados (Web3)</p>
                </div>
            </div>

            {/* BARRA DE FILTROS OBLIGATORIA */}
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Inicio (Obligatorio)</label>
                    <input 
                        type="date" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00306F] outline-none text-sm"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Fecha de Fin (Obligatorio)</label>
                    <input 
                        type="date" 
                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00306F] outline-none text-sm"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>
                <button 
                    onClick={fetchTransactions}
                    disabled={loading || !startDate || !endDate}
                    className="bg-[#00306F] hover:bg-[#002250] text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {loading ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-search-line"></i>}
                    Consultar Periodo
                </button>
            </div>

            <div className="flex justify-end gap-3 mb-4">
                <button
                    onClick={exportCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                    disabled={transactions.length === 0}
                >
                    <i className="ri-file-excel-2-line"></i> Exportar CSV
                </button>
                <button
                    onClick={exportPDF}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                    disabled={transactions.length === 0}
                >
                    <i className="ri-file-pdf-2-line"></i> Exportar PDF
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-md mb-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <i className="ri-wifi-off-line text-red-600 text-2xl"></i>
                        <h3 className="text-red-800 font-bold text-lg">Incidencia de Conectividad</h3>
                    </div>
                    <p className="text-sm text-red-700 font-medium ml-9 mb-1">
                        Detalle técnico: {error}
                    </p>
                    <p className="text-sm text-red-600 ml-9">
                        El orquestador backend se encuentra temporalmente fuera de línea o requiere optimización de red. 
                        Verifique que el servicio Node.js esté ejecutándose correctamente antes de reintentar la consulta.
                    </p>
                </div>
            )}

            {!loading && !error && transactions.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <i className="ri-file-search-line text-4xl text-gray-300 mb-3 block"></i>
                    <p className="text-gray-500 font-medium">Seleccione un rango de fechas y consulte para visualizar los datos.</p>
                </div>
            )}

            {transactions.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-4 px-6 border-b text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PNR</th>
                                <th className="py-4 px-6 border-b text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Hash de Tx</th>
                                <th className="py-4 px-6 border-b text-left text-xs font-bold text-gray-500 uppercase tracking-wider">USDT</th>
                                <th className="py-4 px-6 border-b text-left text-xs font-bold text-gray-500 uppercase tracking-wider">T.C.</th>
                                <th className="py-4 px-6 border-b text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                                <th className="py-4 px-6 border-b text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginated.map((tx, index) => (
                                <tr key={index} className="hover:bg-blue-50 transition-colors">
                                    <td className="py-4 px-6 text-sm text-gray-900 font-bold">{tx.pnr}</td>
                                    <td className="py-4 px-6 text-sm font-mono">
                                        {tx.tx_hash ? (
                                            <a
                                                href={`/explorer/tx/${tx.tx_hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-4"
                                            >
                                                {tx.tx_hash.substring(0, 16)}...
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-6 text-sm text-emerald-700 font-bold">{tx.monto_usdt}</td>
                                    <td className="py-4 px-6 text-sm text-gray-500 font-medium">{tx.tipo_cambio || '10.00'} Bs</td>
                                    <td className="py-4 px-6 text-sm text-gray-600 font-mono">{formatDate(tx.fecha_pago)}</td>
                                    <td className="py-4 px-6">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${tx.tx_hash ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {tx.tx_hash ? 'Confirmada' : 'Pendiente'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 text-sm text-gray-500 bg-gray-50">
                        <span>Mostrando <strong className="text-gray-900">{(page - 1) * ITEMS_PER_PAGE + 1}</strong> al <strong className="text-gray-900">{Math.min(page * ITEMS_PER_PAGE, transactions.length)}</strong> de <strong className="text-gray-900">{transactions.length}</strong> pagos procesados</span>
                        <div className="flex gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`px-3 py-1 rounded border ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Anterior</button>
                            <button className="px-3 py-1 rounded border border-blue-900 bg-blue-900 text-white font-bold">{page}</button>
                            <button onClick={() => setPage(p => p + 1)} disabled={page * ITEMS_PER_PAGE >= transactions.length} className={`px-3 py-1 rounded border ${page * ITEMS_PER_PAGE >= transactions.length ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Siguiente</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
