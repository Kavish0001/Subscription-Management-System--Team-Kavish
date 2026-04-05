import type { jsPDF } from 'jspdf';

import { formatCurrency, formatDate, type Subscription } from '../../lib/api';

type PdfRow = {
  label: string;
  value: string;
};

type RgbColor = [number, number, number];

const COMPANY_NAME = 'Veltrix Subscription ERP';
const PDF_THEME = {
  ink: [2, 6, 23] as RgbColor,
  primary: [5, 150, 105] as RgbColor,
  primaryStrong: [4, 120, 87] as RgbColor,
  accent: [15, 118, 110] as RgbColor,
  muted: [102, 119, 132] as RgbColor,
  border: [216, 232, 221] as RgbColor,
  surface: [242, 251, 245] as RgbColor,
  surfaceStrong: [232, 245, 237] as RgbColor,
  white: [255, 255, 255] as RgbColor
};

export async function downloadSubscriptionPdf(subscription: Subscription) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ format: 'a4', unit: 'pt' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 58;
  const defaultAddress =
    subscription.customerContact.addresses.find((address) => address.isDefault) ??
    subscription.customerContact.addresses[0];
  const contactLines = [
    subscription.customerContact.name,
    subscription.customerContact.companyName,
    subscription.customerContact.email ?? null,
    subscription.customerContact.phone,
    formatAddress(defaultAddress)
  ].filter(Boolean) as string[];

  let cursorY = margin;

  const ensureSpace = (requiredHeight: number, afterPageBreak?: () => void) => {
    if (cursorY + requiredHeight <= bottomLimit) {
      return;
    }

    doc.addPage();
    cursorY = drawContinuationHeader(doc, subscription, margin, contentWidth, margin);
    afterPageBreak?.();
  };

  cursorY = drawHero(doc, subscription, margin, contentWidth, cursorY);
  cursorY += 18;

  const leftCardRows: PdfRow[] = [
    { label: 'Customer', value: subscription.customerContact.name },
    { label: 'Plan', value: subscription.recurringPlan?.name ?? 'Recurring subscription' },
    { label: 'Cadence', value: formatCadence(subscription) },
    { label: 'Contact', value: contactLines.join('\n') || '-' }
  ];
  const rightCardRows: PdfRow[] = [
    { label: 'Status', value: startCase(subscription.status) },
    { label: 'Created', value: formatDate(subscription.createdAt) },
    { label: 'Source', value: textValue(subscription.sourceChannel) },
    { label: 'Start date', value: formatDate(subscription.startDate) },
    { label: 'Next invoice', value: formatDate(subscription.nextInvoiceDate) },
    { label: 'Payment term', value: textValue(subscription.paymentTermLabel, 'Standard') }
  ];
  const cardGap = 16;
  const cardWidth = (contentWidth - cardGap) / 2;
  const customerCardHeight = measureInfoCard(doc, cardWidth, leftCardRows);
  const orderCardHeight = measureInfoCard(doc, cardWidth, rightCardRows);
  const topCardsHeight = Math.max(customerCardHeight, orderCardHeight);

  ensureSpace(topCardsHeight);
  drawInfoCard(doc, margin, cursorY, cardWidth, 'Customer & subscription', leftCardRows, topCardsHeight);
  drawInfoCard(doc, margin + cardWidth + cardGap, cursorY, cardWidth, 'Order overview', rightCardRows, topCardsHeight);
  cursorY += topCardsHeight + 20;

  drawSectionHeading(doc, margin, cursorY, 'Line items');
  cursorY += 18;

  const columnWidths = [contentWidth * 0.45, contentWidth * 0.12, contentWidth * 0.19, contentWidth * 0.24];
  const drawLineTableHeader = () => {
    cursorY = drawTableHeader(doc, margin, cursorY, columnWidths);
  };

  ensureSpace(40, drawLineTableHeader);
  drawLineTableHeader();

  subscription.lines.forEach((line, index) => {
    const description = [line.productNameSnapshot, line.variant?.name ? `Variant: ${line.variant.name}` : null]
      .filter(Boolean)
      .join('\n');
    const rowHeight = measureTableRow(doc, description, columnWidths[0]);

    ensureSpace(rowHeight, drawLineTableHeader);
    drawTableRow(
      doc,
      {
        description,
        quantity: String(line.quantity),
        unitPrice: formatCurrency(line.unitPrice),
        lineTotal: formatCurrency(line.lineTotal)
      },
      margin,
      cursorY,
      columnWidths,
      index % 2 === 0
    );
    cursorY += rowHeight;
  });

  cursorY += 20;

  const totalsRows: PdfRow[] = [
    { label: 'Untaxed amount', value: formatCurrency(subscription.subtotalAmount) },
    { label: 'Discount', value: formatCurrency(subscription.discountAmount) },
    { label: 'Tax', value: formatCurrency(subscription.taxAmount) },
    { label: 'Total', value: formatCurrency(subscription.totalAmount) }
  ];
  const statusRows: PdfRow[] = [
    { label: 'Quotation date', value: formatDate(subscription.quotationDate) },
    { label: 'Quotation expiry', value: formatDate(subscription.quotationExpiresAt) },
    { label: 'Confirmed', value: formatDate(subscription.confirmedAt) },
    { label: 'Expiration', value: formatDate(subscription.expirationDate) }
  ];
  const summaryCardWidth = (contentWidth - cardGap) / 2;
  const financialCardHeight = measureInfoCard(doc, summaryCardWidth, totalsRows, true);
  const lifecycleCardHeight = measureInfoCard(doc, summaryCardWidth, statusRows, true);
  const summaryBlockHeight = Math.max(financialCardHeight, lifecycleCardHeight);

  ensureSpace(summaryBlockHeight);
  drawInfoCard(doc, margin, cursorY, summaryCardWidth, 'Lifecycle dates', statusRows, summaryBlockHeight, true);
  drawInfoCard(doc, margin + summaryCardWidth + cardGap, cursorY, summaryCardWidth, 'Financial summary', totalsRows, summaryBlockHeight, true);
  cursorY += summaryBlockHeight + 20;

  const invoiceRows =
    subscription.invoices.length > 0
      ? subscription.invoices.map((invoice) => ({
          label: invoice.invoiceNumber,
          value: `${startCase(invoice.status)} | Due ${formatDate(invoice.dueDate)} | ${formatCurrency(invoice.amountDue)}`
        }))
      : [{ label: 'Invoices', value: 'No invoices linked yet.' }];
  const historyRows =
    subscription.parentOrder || (subscription.childOrders?.length ?? 0) > 0
      ? [
          ...(subscription.parentOrder
            ? [
                {
                  label: 'Parent',
                  value: `${subscription.parentOrder.subscriptionNumber} | ${startCase(subscription.parentOrder.status)}`
                }
              ]
            : []),
          ...((subscription.childOrders ?? []).map((child) => ({
            label: child.relationType === 'upsell' ? 'Upsell' : 'Renewal',
            value: `${child.subscriptionNumber} | ${startCase(child.status)} | ${formatDate(child.createdAt)}`
          })) satisfies PdfRow[])
        ]
      : [{ label: 'History', value: 'No renewals or upsells yet.' }];
  const invoiceCardHeight = measureInfoCard(doc, cardWidth, invoiceRows);
  const historyCardHeight = measureInfoCard(doc, cardWidth, historyRows);
  const referenceBlockHeight = Math.max(invoiceCardHeight, historyCardHeight);

  ensureSpace(referenceBlockHeight);
  drawInfoCard(doc, margin, cursorY, cardWidth, 'Invoices', invoiceRows, referenceBlockHeight);
  drawInfoCard(doc, margin + cardWidth + cardGap, cursorY, cardWidth, 'Order history', historyRows, referenceBlockHeight);
  cursorY += referenceBlockHeight + 20;

  if (subscription.notes) {
    const notesHeight = measureParagraphCard(doc, contentWidth, subscription.notes);
    ensureSpace(notesHeight);
    drawParagraphCard(doc, margin, cursorY, contentWidth, 'Notes', subscription.notes, notesHeight);
  }

  addFooter(doc, subscription);
  doc.save(`${sanitizeFileName(subscription.subscriptionNumber)}.pdf`);
}

function drawHero(doc: jsPDF, subscription: Subscription, x: number, width: number, y: number) {
  const heroHeight = 126;

  doc.setFillColor(...PDF_THEME.primaryStrong);
  doc.roundedRect(x, y, width, heroHeight, 28, 28, 'F');

  doc.setFillColor(...PDF_THEME.primary);
  doc.roundedRect(x + width - 166, y + 16, 138, 86, 22, 22, 'F');

  doc.setTextColor(...PDF_THEME.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(COMPANY_NAME.toUpperCase(), x + 24, y + 28);

  doc.setFontSize(28);
  doc.text('Subscription Order', x + 24, y + 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(
    [subscription.recurringPlan?.name ?? 'Recurring subscription', `Source: ${textValue(subscription.sourceChannel)}`],
    x + 24,
    y + 84
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ORDER NUMBER', x + width - 150, y + 38);

  doc.setFontSize(16);
  doc.text(subscription.subscriptionNumber, x + width - 150, y + 62);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Status: ${startCase(subscription.status)}`, x + width - 150, y + 84);

  return y + heroHeight;
}

function drawContinuationHeader(doc: jsPDF, subscription: Subscription, x: number, width: number, y: number) {
  doc.setFillColor(...PDF_THEME.surface);
  doc.setDrawColor(...PDF_THEME.border);
  doc.roundedRect(x, y, width, 48, 18, 18, 'FD');

  doc.setTextColor(...PDF_THEME.primaryStrong);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Subscription Order', x + 18, y + 28);

  doc.setTextColor(...PDF_THEME.muted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subscription.subscriptionNumber, x + width - 18, y + 28, { align: 'right' });

  return y + 62;
}

function drawSectionHeading(doc: jsPDF, x: number, y: number, title: string) {
  doc.setTextColor(...PDF_THEME.primaryStrong);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), x, y);
}

function measureInfoCard(doc: jsPDF, width: number, rows: PdfRow[], emphasizeLast = false) {
  let height = 52;

  rows.forEach((row, index) => {
    const valueLines = doc.splitTextToSize(row.value, width - 148);
    const textHeight = Math.max(18, valueLines.length * 12 + 6);
    height += textHeight + (index === rows.length - 1 ? 0 : 8);
  });

  if (emphasizeLast) {
    height += 6;
  }

  return Math.max(height + 16, 168);
}

function drawInfoCard(doc: jsPDF, x: number, y: number, width: number, title: string, rows: PdfRow[], height: number, emphasizeLast = false) {
  doc.setFillColor(...PDF_THEME.surface);
  doc.setDrawColor(...PDF_THEME.border);
  doc.roundedRect(x, y, width, height, 24, 24, 'FD');

  doc.setTextColor(...PDF_THEME.primaryStrong);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), x + 18, y + 24);

  let rowY = y + 48;
  rows.forEach((row, index) => {
    const isLast = index === rows.length - 1;
    const valueLines = doc.splitTextToSize(row.value, width - 148);
    const rowHeight = Math.max(18, valueLines.length * 12 + 6);

    if (!isLast) {
      doc.setDrawColor(...PDF_THEME.border);
      doc.line(x + 18, rowY + rowHeight + 4, x + width - 18, rowY + rowHeight + 4);
    }

    doc.setTextColor(...PDF_THEME.muted);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(row.label.toUpperCase(), x + 18, rowY + 10);

    doc.setTextColor(...PDF_THEME.ink);
    doc.setFont('helvetica', emphasizeLast && isLast ? 'bold' : 'normal');
    doc.setFontSize(emphasizeLast && isLast ? 12 : 10);
    doc.text(valueLines, x + 112, rowY + 10);

    rowY += rowHeight + 8;
  });
}

function drawTableHeader(doc: jsPDF, x: number, y: number, columnWidths: number[]) {
  const headerHeight = 30;

  doc.setFillColor(...PDF_THEME.surfaceStrong);
  doc.setDrawColor(...PDF_THEME.border);
  doc.roundedRect(x, y, columnWidths.reduce((sum, width) => sum + width, 0), headerHeight, 16, 16, 'FD');

  doc.setTextColor(...PDF_THEME.primaryStrong);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  const titles = ['Description', 'Qty', 'Unit Price', 'Amount'];
  let offsetX = x;
  titles.forEach((title, index) => {
    const textX = index === 0 ? offsetX + 12 : offsetX + columnWidths[index] - 12;
    doc.text(title.toUpperCase(), textX, y + 19, index === 0 ? undefined : { align: 'right' });
    offsetX += columnWidths[index];
  });

  return y + headerHeight + 8;
}

function measureTableRow(doc: jsPDF, description: string, descriptionWidth: number) {
  const lines = doc.splitTextToSize(description, descriptionWidth - 24);
  return Math.max(34, lines.length * 12 + 16);
}

function drawTableRow(
  doc: jsPDF,
  row: {
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  },
  x: number,
  y: number,
  columnWidths: number[],
  tinted: boolean
) {
  const descriptionLines = doc.splitTextToSize(row.description, columnWidths[0] - 24);
  const rowHeight = measureTableRow(doc, row.description, columnWidths[0]);
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  doc.setFillColor(...(tinted ? PDF_THEME.white : PDF_THEME.surface));
  doc.setDrawColor(...PDF_THEME.border);
  doc.roundedRect(x, y, tableWidth, rowHeight, 12, 12, 'FD');

  const columns = [row.description, row.quantity, row.unitPrice, row.lineTotal];
  let offsetX = x;

  columns.forEach((cell, index) => {
    doc.setTextColor(...PDF_THEME.ink);
    doc.setFont('helvetica', index === 3 ? 'bold' : 'normal');
    doc.setFontSize(index === 0 ? 10 : 9);

    if (index === 0) {
      doc.text(descriptionLines, offsetX + 12, y + 16);
    } else {
      doc.text(cell, offsetX + columnWidths[index] - 12, y + 16, { align: 'right' });
    }

    offsetX += columnWidths[index];
  });
}

function measureParagraphCard(doc: jsPDF, width: number, paragraph: string) {
  const lines = doc.splitTextToSize(paragraph, width - 36);
  return Math.max(124, 56 + lines.length * 12);
}

function drawParagraphCard(doc: jsPDF, x: number, y: number, width: number, title: string, paragraph: string, height: number) {
  doc.setFillColor(...PDF_THEME.surface);
  doc.setDrawColor(...PDF_THEME.border);
  doc.roundedRect(x, y, width, height, 24, 24, 'FD');

  doc.setTextColor(...PDF_THEME.primaryStrong);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), x + 18, y + 24);

  doc.setTextColor(...PDF_THEME.ink);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(paragraph, width - 36), x + 18, y + 48);
}

function addFooter(doc: jsPDF, subscription: Subscription) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...PDF_THEME.border);
    doc.line(36, pageHeight - 34, pageWidth - 36, pageHeight - 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.muted);
    doc.text(`Generated for ${subscription.subscriptionNumber}`, 36, pageHeight - 18);
    doc.text(`Page ${page} of ${totalPages}`, pageWidth - 36, pageHeight - 18, { align: 'right' });
  }
}

function sanitizeFileName(value: string) {
  return value
    .split('')
    .map((character) => (character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character))
    .join('')
    .replace(/\s+/g, '-');
}

function textValue(value: string | null | undefined, fallback = '-') {
  return value && value.trim() ? value : fallback;
}

function startCase(value: string | null | undefined) {
  if (!value) {
    return '-';
  }

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCadence(subscription: Subscription) {
  const plan = subscription.recurringPlan;

  if (!plan) {
    return 'Recurring schedule';
  }

  if (plan.intervalCount === 1) {
    return `Every ${plan.intervalUnit}`;
  }

  return `Every ${plan.intervalCount} ${plan.intervalUnit}s`;
}

function formatAddress(
  address:
    | {
        line1: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      }
    | null
    | undefined
) {
  if (!address) {
    return null;
  }

  return [address.line1, `${address.city}, ${address.state} ${address.postalCode}`, address.country]
    .filter(Boolean)
    .join(', ');
}
