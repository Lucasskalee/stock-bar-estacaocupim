import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BeverageItem } from '../types/inventory';
import {
  calcAlvo,
  calcConsumo,
  calcPedido,
  computeSummary,
  formatBusinessDateShort,
  toLocalDateISO,
} from './calculations';

import { getTransparentLogo } from './logoProcessor';

function formatCell(val: number | null): string {
  return val === null ? '-' : String(val);
}

export async function generateInventoryPdf(
  items: BeverageItem[],
  options?: {
    dataOperacional?: string;
    customTitle?: string;
    emittedAt?: Date;
  }
): Promise<string> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;

  const agora = options?.emittedAt ?? new Date();
  const dataEmissao = agora.toLocaleDateString('pt-BR');
  const horaEmissao = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataOperacional = options?.dataOperacional ?? toLocalDateISO(agora);
  const dataTurnoLabel = formatBusinessDateShort(dataOperacional);

  const summary = computeSummary(items);
  const processedLogo = await getTransparentLogo();

  // Header band — Balcão Noturno dark charcoal + amber bottom rule
  const headerHeight = 38;
  doc.setFillColor(23, 21, 18); // #171512
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  doc.setFillColor(217, 138, 43); // #D98A2B
  doc.rect(0, headerHeight, pageWidth, 1.2, 'F');

  let textStartX = marginX;
  if (processedLogo) {
    const maxLogoH = 22;
    const maxLogoW = 36;
    let drawW = maxLogoH * processedLogo.aspectRatio;
    let drawH = maxLogoH;
    if (drawW > maxLogoW) {
      drawW = maxLogoW;
      drawH = drawW / processedLogo.aspectRatio;
    }
    const logoY = (headerHeight - drawH) / 2;
    doc.addImage(processedLogo.dataUrl, 'PNG', marginX, logoY, drawW, drawH);
    textStartX = marginX + drawW + 5;
  }

  doc.setTextColor(245, 240, 232);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('STOKBAR CUPIM', textStartX, 15.5);

  doc.setTextColor(217, 138, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    options?.customTitle ?? `Conferência de Estoque · Turno de ${dataTurnoLabel}`,
    textStartX,
    22
  );

  doc.setTextColor(186, 177, 162);
  doc.setFontSize(8.5);
  doc.text(`Turno: ${dataTurnoLabel}`, pageWidth - marginX, 14.5, { align: 'right' });
  doc.text(`Fechamento: ${dataEmissao} às ${horaEmissao}`, pageWidth - marginX, 20.5, {
    align: 'right',
  });
  doc.text(`${summary.itensConferidos}/${summary.totalItens} bebidas conferidas`, pageWidth - marginX, 26.5, {
    align: 'right',
  });

  // KPI summary strip
  const kpiY = 45;
  const kpiHeight = 16;
  const kpiGap = 4;
  const kpiWidth = (pageWidth - marginX * 2 - kpiGap * 3) / 4;

  const kpis = [
    { label: 'BEBIDAS', value: String(summary.totalItens), accent: false },
    { label: 'CONSUMO DO TURNO', value: `${summary.totalConsumo} un`, accent: false },
    { label: 'ITENS PARA REPOR', value: String(summary.itensParaRepor), accent: summary.itensParaRepor > 0 },
    { label: 'TOTAL A PEDIR', value: `${summary.totalUnidadesPedir} un`, accent: summary.totalUnidadesPedir > 0 },
  ];

  kpis.forEach((kpi, index) => {
    const x = marginX + index * (kpiWidth + kpiGap);
    doc.setFillColor(248, 246, 242);
    doc.setDrawColor(228, 222, 212);
    doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(115, 107, 94);
    doc.text(kpi.label, x + 3.5, kpiY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    if (kpi.accent) {
      doc.setTextColor(192, 66, 48);
    } else {
      doc.setTextColor(23, 21, 18);
    }
    doc.text(kpi.value, x + 3.5, kpiY + 12.5);
  });

  const drawFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setDrawColor(228, 222, 212);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(115, 107, 94);
    doc.text(
      `Estação Cupim · Turno de ${dataTurnoLabel} · Gerado em ${dataEmissao} às ${horaEmissao}`,
      marginX,
      pageHeight - 8
    );
    doc.text(`Página ${pageNum}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  };

  autoTable(doc, {
    startY: kpiY + kpiHeight + 6,
    margin: { left: marginX, right: marginX, bottom: 18 },
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2.4,
      textColor: [28, 25, 22],
      lineColor: [228, 222, 212],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [31, 28, 24],
      textColor: [245, 240, 232],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [250, 248, 244],
    },
    footStyles: {
      fillColor: [238, 233, 224],
      textColor: [23, 21, 18],
      fontStyle: 'bold',
    },
    head: [['#', 'Bebida', 'Categoria', 'Inicial', 'Final', 'Consumo', 'Ideal', 'Pedir']],
    body: items.map((item, idx) => [
      idx + 1,
      item.nome,
      item.categoria,
      formatCell(item.inicial),
      formatCell(item.final),
      formatCell(calcConsumo(item)),
      formatCell(calcAlvo(item)),
      formatCell(calcPedido(item)),
    ]),
    foot: [
      [
        '',
        'Total Geral',
        '',
        String(summary.totalInicial),
        String(summary.totalFinal),
        String(summary.totalConsumo),
        '',
        String(summary.totalUnidadesPedir),
      ],
    ],
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 26, halign: 'left' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 16, halign: 'center' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 7) {
        const val = Number(hookData.cell.raw);
        if (Number.isFinite(val) && val > 0) {
          hookData.cell.styles.textColor = [192, 66, 48];
        } else {
          hookData.cell.styles.textColor = [115, 107, 94];
        }
      }
      if (hookData.section === 'foot' && hookData.column.index >= 3) {
        hookData.cell.styles.halign = 'center';
      }
    },
    didDrawPage: drawFooter,
  });

  const pedidos = items
    .map((item) => ({ item, qtd: calcPedido(item) ?? 0 }))
    .filter((entry) => entry.qtd > 0);

  const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
  let sectionY = lastY + 10;

  if (sectionY > pageHeight - 42) {
    doc.addPage();
    drawFooter();
    sectionY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(23, 21, 18);
  doc.text('Pedido Sugerido de Reposição', marginX, sectionY);

  doc.setDrawColor(217, 138, 43);
  doc.setLineWidth(0.6);
  doc.line(marginX, sectionY + 2, marginX + 58, sectionY + 2);

  if (pedidos.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(115, 107, 94);
    doc.text('Nenhum pedido de reposição necessário neste turno.', marginX, sectionY + 9);
  } else {
    autoTable(doc, {
      startY: sectionY + 5,
      margin: { left: marginX, right: marginX, bottom: 18 },
      theme: 'grid',
      styles: {
        fontSize: 9.5,
        cellPadding: 2.5,
        textColor: [28, 25, 22],
        lineColor: [228, 222, 212],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [166, 97, 20],
        textColor: [255, 252, 247],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [252, 249, 243],
      },
      footStyles: {
        fillColor: [238, 233, 224],
        textColor: [23, 21, 18],
        fontStyle: 'bold',
      },
      head: [['Bebida', 'Categoria', 'Estoque Atual', 'Ideal', 'Quantidade a Pedir']],
      body: pedidos.map(({ item, qtd }) => [
        item.nome,
        item.categoria,
        formatCell(item.final),
        formatCell(calcAlvo(item)),
        `${qtd} un`,
      ]),
      foot: [['Total a Pedir', `${pedidos.length} itens`, '', '', `${summary.totalUnidadesPedir} un`]],
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 32, halign: 'left' },
        2: { cellWidth: 26, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 34, halign: 'center', fontStyle: 'bold', textColor: [166, 97, 20] },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'foot' && hookData.column.index === 4) {
          hookData.cell.styles.halign = 'center';
        }
      },
      didDrawPage: drawFooter,
    });
  }

  const fileName = `conferencia_${dataOperacional}_${horaEmissao.replace(':', 'h')}.pdf`;
  doc.save(fileName);
  return fileName;
}
