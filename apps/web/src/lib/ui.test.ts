import { formatStatusLabel, getStatusTone } from './ui';

describe('ui helpers', () => {
  it('maps status strings to title case labels', () => {
    expect(formatStatusLabel('quotation_sent')).toBe('Quotation Sent');
    expect(formatStatusLabel('in_progress')).toBe('In Progress');
  });

  it('maps statuses to consistent tones', () => {
    expect(getStatusTone('in_progress')).toBe('success');
    expect(getStatusTone('quotation_sent')).toBe('info');
    expect(getStatusTone('draft')).toBe('neutral');
    expect(getStatusTone('closed')).toBe('warning');
    expect(getStatusTone('overdue')).toBe('danger');
  });
});
