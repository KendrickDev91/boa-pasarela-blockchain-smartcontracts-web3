// Reporte de conciliación de cobros en USDT: PDF con logo, sumatorias, firmas, sello y evidencia de auditoría
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import boaLogo from '../assets/boa-logo.png';
import { BOA_PAYMENTS_ADDRESS, CHAIN_ID } from '../constants/contracts.js';

const AZUL = [0, 48, 111];
const pad = (n) => n.toString().padStart(2, '0');
export const fechaHora = (v) => {
  if (!v) return 'N/A';
  const d = new Date(v);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const num = (v, dec) => Number(v || 0).toLocaleString('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Sumatorias del conjunto filtrado */
export function totales(filas) {
  const bob = filas.reduce((s, t) => s + Number(t.monto_bob || 0), 0);
  const usdt = filas.reduce((s, t) => s + Number(t.monto_usdt || 0), 0);
  return { cantidad: filas.length, bob, usdt, tcPromedio: usdt > 0 ? bob / usdt : 0 };
}

/** Huella SHA-256 del contenido del reporte (evidencia de integridad) */
export async function huella(filas) {
  const canon = filas.map((t) => [t.pnr, t.tx_hash || '', t.bloque_red || '', t.monto_bob, t.monto_usdt, t.tipo_cambio, t.fecha_pago || ''].join('|')).join('\n');
  const bytes = new TextEncoder().encode(canon);
  const dig = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const cargarImagen = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });

function sello(doc, cx, cy, fecha) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.85 }));
  doc.setDrawColor(20, 70, 160); doc.setTextColor(20, 70, 160);
  doc.setLineWidth(0.9); doc.circle(cx, cy, 19, 'S');
  doc.setLineWidth(0.4); doc.circle(cx, cy, 16.5, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(5.4);
  doc.text('BOLIVIANA DE AVIACIÓN', cx, cy - 8.6, { align: 'center' });
  doc.text('GERENCIA DE FINANZAS', cx, cy - 5.4, { align: 'center' });
  doc.setFontSize(9.5); doc.text('CONCILIADO', cx, cy + 0.8, { align: 'center' });
  doc.setFontSize(6); doc.setFont('helvetica', 'normal');
  doc.text(fecha, cx, cy + 5.6, { align: 'center' });
  doc.text('Canal USDT · Web3', cx, cy + 9.2, { align: 'center' });
  doc.restoreGraphicsState();
}

/**
 * Genera el PDF.
 * opciones: { desde, hasta, filtroEstado, busqueda, elaboradoPor, cargo, revisadoPor, cargoRevisor, firma (dataURL), conSello }
 */
export async function generarReportePDF(filas, opciones) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const ahora = new Date();
  const folio = `CONC-${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${ahora.getTime().toString().slice(-5)}`;
  const t = totales(filas);
  const sha = await huella(filas);
  const logo = await cargarImagen(boaLogo);

  // Encabezado
  doc.setFillColor(248, 250, 252); doc.rect(0, 0, W, 34, 'F');
  doc.addImage(logo, 'PNG', 14, 8, 38, 13);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...AZUL);
  doc.text('Reporte de conciliación de cobros en USDT', 60, 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
  const periodo = opciones.desde || opciones.hasta
    ? `Periodo: ${fechaCorta(opciones.desde) || 'inicio'} al ${fechaCorta(opciones.hasta) || fechaHora(ahora).slice(0, 10)}`
    : 'Periodo: todos los registros';
  doc.text(periodo, 60, 20);
  const criterios = [`Estado: ${opciones.filtroEstado || 'Todas'}`];
  if (opciones.busqueda) criterios.push(`PNR contiene "${opciones.busqueda}"`);
  doc.text(`Criterios de filtro: ${criterios.join(' · ')}`, 60, 25);
  doc.text(`Folio: ${folio}`, W - 14, 12, { align: 'right' });
  doc.text(`Emitido: ${fechaHora(ahora)}`, W - 14, 17, { align: 'right' });
  doc.text(`Contrato: ${BOA_PAYMENTS_ADDRESS.slice(0, 10)}…${BOA_PAYMENTS_ADDRESS.slice(-6)} · Red ${CHAIN_ID}`, W - 14, 22, { align: 'right' });

  // Detalle con sumatoria
  autoTable(doc, {
    startY: 40,
    head: [['N°', 'Fecha de pago', 'PNR', 'Monto (Bs)', 'T/C', 'Monto (USDT)', 'Bloque', 'Hash de la transacción', 'Estado']],
    body: filas.map((r, i) => [i + 1, fechaHora(r.fecha_pago), r.pnr, num(r.monto_bob, 2), num(r.tipo_cambio, 4), num(r.monto_usdt, 2),
      r.bloque_red || '—', r.tx_hash ? `${r.tx_hash.slice(0, 18)}…${r.tx_hash.slice(-6)}` : 'N/A', r.tx_hash ? 'Confirmado' : 'Pendiente']),
    foot: [['', 'TOTAL', `${t.cantidad} pagos`, num(t.bob, 2), num(t.tcPromedio, 4), num(t.usdt, 2), '', 'T/C promedio ponderado = total Bs / total USDT', '']],
    theme: 'grid',
    headStyles: { fillColor: AZUL, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    footStyles: { fillColor: [221, 235, 247], textColor: AZUL, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { textColor: [51, 65, 85], fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { halign: 'right', cellWidth: 10 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { font: 'courier' } },
    styles: { cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.1 },
    showFoot: 'lastPage',
    didParseCell: (d) => {
      if (d.section === 'foot') { d.cell.styles.font = 'helvetica'; if ([3, 4, 5].includes(d.column.index)) d.cell.styles.halign = 'right'; }
    },
    margin: { top: 14, bottom: 18, left: 14, right: 14 },
  });

  // Resumen y evidencia de auditoría
  let y = doc.lastAutoTable.finalY + 8;
  if (y > H - 85) { doc.addPage(); y = 20; }
  autoTable(doc, {
    startY: y,
    head: [['Resumen de conciliación', '']],
    body: [
      ['Pagos conciliados', `${t.cantidad}`],
      ['Total recaudado en bolivianos', `Bs ${num(t.bob, 2)}`],
      ['Total recaudado en USDT', `${num(t.usdt, 2)} USDT`],
      ['Tipo de cambio promedio ponderado', `${num(t.tcPromedio, 4)} Bs por USD`],
    ],
    theme: 'grid', tableWidth: 125, margin: { left: 14 },
    headStyles: { fillColor: AZUL, fontSize: 8.5 }, bodyStyles: { fontSize: 8.5 }, columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
  });
  autoTable(doc, {
    startY: y,
    head: [['Evidencia de auditoría']],
    body: [
      ['Origen de los datos: registros de PostgreSQL vinculados 1:1 al evento PagoConfirmado del contrato BoAPayments.'],
      [`Huella SHA-256 del contenido del reporte:\n${sha}`],
      ['Verificación: cada hash puede consultarse en el explorador de bloques; volver a generar el reporte con los mismos filtros debe producir la misma huella.'],
    ],
    theme: 'grid', tableWidth: W - 14 - 147, margin: { left: 147 },
    headStyles: { fillColor: AZUL, fontSize: 8.5 }, bodyStyles: { fontSize: 7.8 },
    didParseCell: (d) => { if (d.section === 'body' && d.row.index === 1) d.cell.styles.font = 'courier'; },
  });

  // Firmas y sello
  y = Math.max(doc.lastAutoTable.finalY, y + 40) + 10;
  if (y > H - 48) { doc.addPage(); y = 25; }
  const x1 = 30, x2 = 135;
  if (opciones.firma) doc.addImage(opciones.firma, 'PNG', x1 + 5, y, 60, 20);
  doc.setDrawColor(51, 65, 85); doc.setLineWidth(0.3);
  doc.line(x1, y + 22, x1 + 70, y + 22); doc.line(x2, y + 22, x2 + 70, y + 22);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(30, 41, 59);
  doc.text(opciones.elaboradoPor || 'Elaborado por', x1 + 35, y + 27, { align: 'center' });
  doc.text(opciones.revisadoPor || 'Revisado y aprobado por', x2 + 35, y + 27, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105);
  doc.text(opciones.cargo || 'Personal de Finanzas', x1 + 35, y + 31, { align: 'center' });
  doc.text(opciones.cargoRevisor || 'Gerencia de Finanzas', x2 + 35, y + 31, { align: 'center' });
  doc.text('ELABORADO', x1 + 35, y + 35, { align: 'center' });
  doc.text('REVISADO Y APROBADO', x2 + 35, y + 35, { align: 'center' });
  if (opciones.conSello) sello(doc, 245, y + 14, fechaHora(ahora).slice(0, 10));

  // Pie de página
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Boliviana de Aviación · Pasarela de cobro en USDT · ${folio} · SHA-256 ${sha.slice(0, 16)}…`, 14, H - 8);
    doc.text(`Página ${i} de ${n}`, W - 14, H - 8, { align: 'right' });
  }
  doc.save(`reporte_conciliacion_${folio}.pdf`);
  return { folio, sha };
}

/** CSV con las mismas columnas, la sumatoria y la huella */
export async function generarReporteCSV(filas, opciones) {
  const t = totales(filas);
  const sha = await huella(filas);
  const e = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = [
    ['N°', 'Fecha de pago', 'PNR', 'Monto Bs', 'Tipo de cambio', 'Monto USDT', 'Bloque', 'Hash de la transacción', 'Billetera del cliente', 'Estado'].map(e).join(','),
    ...filas.map((r, i) => [i + 1, fechaHora(r.fecha_pago), r.pnr, r.monto_bob, r.tipo_cambio, r.monto_usdt, r.bloque_red, r.tx_hash, r.wallet_cliente, r.tx_hash ? 'CONFIRMADO' : 'PENDIENTE'].map(e).join(',')),
    ['', 'TOTAL', `${t.cantidad} pagos`, t.bob.toFixed(2), t.tcPromedio.toFixed(4), t.usdt.toFixed(6), '', '', '', ''].map(e).join(','),
    '',
    [`Periodo: ${opciones.desde || 'inicio'} a ${opciones.hasta || 'hoy'}`].map(e).join(','),
    [`SHA-256 del contenido: ${sha}`].map(e).join(','),
  ];
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `reporte_conciliacion_${opciones.desde || 'inicio'}_${opciones.hasta || 'hoy'}.csv`; a.click();
}
