import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  variantId?: string;
  recurringPlanId?: string;
  productName: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
}

export interface AppliedDiscount {
  code: string;
  discountAmount: number;
  ruleName: string;
}

interface CartState {
  items: CartItem[];
  discount: AppliedDiscount | null;
  shippingAddressId: string | null;
  billingAddressId: string | null;
  paymentTermId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, variantId: string | undefined, qty: number) => void;
  applyDiscount: (discount: AppliedDiscount) => void;
  removeDiscount: () => void;
  setAddresses: (shippingId: string, billingId: string) => void;
  setPaymentTerm: (id: string) => void;
  clear: () => void;
  subtotal: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: null,
      shippingAddressId: null,
      billingAddressId: null,
      paymentTermId: null,
      addItem: (item) => set((s) => {
        const existing = s.items.find(i => i.productId === item.productId && i.variantId === item.variantId);
        if (existing) return { items: s.items.map(i => i.productId === item.productId && i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i) };
        return { items: [...s.items, item] };
      }),
      removeItem: (productId, variantId) => set((s) => ({ items: s.items.filter(i => !(i.productId === productId && i.variantId === variantId)) })),
      updateQty: (productId, variantId, qty) => set((s) => ({ items: s.items.map(i => i.productId === productId && i.variantId === variantId ? { ...i, quantity: qty } : i) })),
      applyDiscount: (discount) => set({ discount }),
      removeDiscount: () => set({ discount: null }),
      setAddresses: (shippingAddressId, billingAddressId) => set({ shippingAddressId, billingAddressId }),
      setPaymentTerm: (paymentTermId) => set({ paymentTermId }),
      clear: () => set({ items: [], discount: null, shippingAddressId: null, billingAddressId: null, paymentTermId: null }),
      subtotal: () => get().items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      total: () => {
        const sub = get().subtotal();
        const dis = get().discount?.discountAmount ?? 0;
        return Math.max(sub - dis, 0);
      },
    }),
    { name: 'cart-storage' }
  )
);
