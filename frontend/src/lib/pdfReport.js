import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = [123, 58, 237]; // odoo-600-ish purple used across the app

/**
 * sections: [{ heading, stats?: [{label, value}], table?: { columns, rows } }]
 */
export function downloadReportPdf({ title, subtitle, generatedFor, sections, filename }) {
  const doc = new jsPDF({ unit: 'pt' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFontSize(18);
  doc.setTextColor(30, 27, 46);
  doc.text(title, 40, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 120);
  doc.text(subtitle, 40, y);
  y += 14;
  doc.text(`Generated for ${generatedFor} · ${new Date().toLocaleString()}`, 40, y);
  y += 24;

  sections.forEach((section) => {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    doc.setFontSize(13);
    doc.setTextColor(30, 27, 46);
    doc.text(section.heading, 40, y);
    y += 10;

    if (section.stats?.length) {
      y += 12;
      const colWidth = (pageWidth - 80) / Math.min(section.stats.length, 4);
      section.stats.forEach((s, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 40 + col * colWidth;
        const rowY = y + row * 44;
        doc.setDrawColor(230, 228, 235);
        doc.roundedRect(x, rowY, colWidth - 10, 36, 4, 4, 'S');
        doc.setFontSize(8);
        doc.setTextColor(140, 140, 150);
        doc.text(String(s.label), x + 8, rowY + 14);
        doc.setFontSize(12);
        doc.setTextColor(30, 27, 46);
        doc.text(String(s.value), x + 8, rowY + 28);
      });
      y += Math.ceil(section.stats.length / 4) * 44 + 16;
    }

    if (section.table?.rows?.length) {
      autoTable(doc, {
        startY: y,
        head: [section.table.columns],
        body: section.table.rows,
        margin: { left: 40, right: 40 },
        styles: { fontSize: 8.5, cellPadding: 5 },
        headStyles: { fillColor: BRAND, textColor: 255 },
        alternateRowStyles: { fillColor: [248, 247, 250] },
      });
      y = doc.lastAutoTable.finalY + 24;
    } else if (section.table) {
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 160);
      doc.text('No data.', 40, y + 14);
      y += 30;
    }
  });

  doc.save(filename);
}
