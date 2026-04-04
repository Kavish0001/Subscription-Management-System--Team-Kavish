export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const subscriptionFlow = ['draft', 'quotation', 'quotation_sent', 'confirmed', 'in_progress', 'closed'] as const;

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function formatStatusLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusTone(value: string): StatusTone {
  const status = value.toLowerCase();

  if (['paid', 'in_progress', 'active', 'completed'].includes(status)) {
    return 'success';
  }

  if (['quotation', 'confirmed', 'quotation_sent', 'sent', 'processing'].includes(status)) {
    return 'info';
  }

  if (['closed'].includes(status)) {
    return 'warning';
  }

  if (['overdue', 'cancelled', 'failed', 'churned'].includes(status)) {
    return 'danger';
  }

  if (['draft', 'pending'].includes(status)) {
    return 'neutral';
  }

  return 'warning';
}
