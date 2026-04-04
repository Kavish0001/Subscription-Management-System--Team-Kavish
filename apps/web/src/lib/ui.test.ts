import { formatStatusLabel, getStatusTone } from './ui';

describe('ui helpers', () => {
  it('maps status strings to title case labels', () => {
    expect(formatStatusLabel('quotation_sent')).toBe('Quotation Sent');
  });

  it('maps statuses to consistent tones', () => {
    expect(getStatusTone('active')).toBe('success');
    expect(getStatusTone('quotation_sent')).toBe('info');
    expect(getStatusTone('draft')).toBe('neutral');
    expect(getStatusTone('overdue')).toBe('danger');
  });
});
