import { cartSubtotal, useCartStore } from './cart';

const baseItem = {
  productId: 'prod-1',
  slug: 'core-erp',
  name: 'Core ERP',
  imageUrl: null,
  recurringPlanId: 'plan-1',
  recurringPlanName: 'Monthly',
  unitPrice: 499,
  quantity: 1
};

describe('cart store', () => {
  beforeEach(() => {
    localStorage.clear();
    useCartStore.setState({
      items: [],
      discountCode: '',
      discountPercent: 0
    });
  });

  it('adds duplicate items by increasing quantity', () => {
    useCartStore.getState().addItem(baseItem);
    useCartStore.getState().addItem(baseItem);

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
  });

  it('applies and clears discount codes', () => {
    expect(useCartStore.getState().applyDiscount(' welcome10 ')).toBe(true);
    expect(useCartStore.getState().discountCode).toBe('WELCOME10');
    expect(useCartStore.getState().discountPercent).toBe(0);

    useCartStore.getState().clearDiscount();

    expect(useCartStore.getState().discountCode).toBe('');
    expect(useCartStore.getState().discountPercent).toBe(0);
  });

  it('removes entries when quantity is updated to zero', () => {
    useCartStore.getState().addItem(baseItem);
    useCartStore.getState().updateQuantity(baseItem.productId, baseItem.recurringPlanId, 0);

    expect(useCartStore.getState().items).toEqual([]);
  });

  it('computes cart subtotals', () => {
    expect(
      cartSubtotal([
        { ...baseItem, quantity: 2 },
        { ...baseItem, productId: 'prod-2', recurringPlanId: 'plan-2', unitPrice: 199, quantity: 3 }
      ])
    ).toBe(1595);
  });
});
