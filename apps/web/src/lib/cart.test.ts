import {
  activateGuestCart,
  activateUserCart,
  cartSubtotal,
  finalizeGuestCartForSignup,
  hasCurrentSessionGuestCart,
  useCartStore,
} from './cart';

const baseItem = {
  productId: 'prod-1',
  slug: 'core-erp',
  name: 'Core ERP',
  imageUrl: null,
  recurringPlanId: 'plan-1',
  recurringPlanName: 'Monthly',
  unitPrice: 499,
  quantity: 1,
};

describe('cart store', () => {
  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    useCartStore.setState({
      items: [],
      discountCode: '',
      discountPercent: 0,
    });
    await activateGuestCart({ clearGuestCart: true });
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

  it('removes all cart entries for unavailable products', () => {
    useCartStore.getState().addItem(baseItem);
    useCartStore.getState().addItem({
      ...baseItem,
      productId: 'prod-2',
      recurringPlanId: 'plan-2',
    });

    useCartStore.getState().removeProducts(['prod-2']);

    expect(useCartStore.getState().items).toEqual([baseItem]);
  });

  it('computes cart subtotals', () => {
    expect(
      cartSubtotal([
        { ...baseItem, quantity: 2 },
        {
          ...baseItem,
          productId: 'prod-2',
          recurringPlanId: 'plan-2',
          unitPrice: 199,
          quantity: 3,
        },
      ]),
    ).toBe(1595);
  });

  it('transfers the current guest cart to a newly verified signup account', async () => {
    useCartStore.getState().addItem(baseItem);

    expect(hasCurrentSessionGuestCart()).toBe(true);
    expect(finalizeGuestCartForSignup()).toBe(true);

    await activateUserCart('user-signup', { transferPendingSignupCart: true });

    expect(useCartStore.getState().items).toEqual([baseItem]);

    await activateGuestCart();

    expect(useCartStore.getState().items).toEqual([]);
  });

  it('clears stale guest cart data on signup when it was not changed in the current session', () => {
    useCartStore.setState({
      items: [baseItem],
      discountCode: '',
      discountPercent: 0,
    });
    sessionStorage.clear();

    expect(finalizeGuestCartForSignup()).toBe(false);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('loads the logged-in user cart instead of the guest cart', async () => {
    await activateUserCart('user-1');
    useCartStore.getState().addItem({
      ...baseItem,
      productId: 'prod-user',
      recurringPlanId: 'plan-user',
    });

    await activateGuestCart({ clearGuestCart: true });
    useCartStore.getState().addItem(baseItem);

    await activateUserCart('user-1');

    expect(useCartStore.getState().items).toEqual([
      {
        ...baseItem,
        productId: 'prod-user',
        recurringPlanId: 'plan-user',
      },
    ]);

    await activateGuestCart();

    expect(useCartStore.getState().items).toEqual([]);
  });
});
