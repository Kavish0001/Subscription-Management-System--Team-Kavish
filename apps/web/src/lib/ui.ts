export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const subscriptionFlow = ['draft', 'quotation_sent', 'confirmed', 'active', 'closed'] as const;

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

  if (['paid', 'active', 'completed'].includes(status)) {
    return 'success';
  }

  if (['confirmed', 'quotation_sent', 'sent', 'processing'].includes(status)) {
    return 'info';
  }

  if (['overdue', 'cancelled', 'failed', 'closed'].includes(status)) {
    return 'danger';
  }

  if (['draft', 'pending'].includes(status)) {
    return 'neutral';
  }

  return 'warning';
}
