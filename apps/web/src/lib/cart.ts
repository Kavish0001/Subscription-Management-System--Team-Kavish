import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  recurringPlanId: string | null;
  recurringPlanName: string;
  variantId?: string | null;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  discountCode: string;
  discountPercent: number;
  addItem: (item: CartItem) => void;
  removeProducts: (productIds: string[]) => void;
  removeItem: (productId: string, recurringPlanId: string | null, variantId?: string | null) => void;
  updateQuantity: (productId: string, recurringPlanId: string | null, quantity: number, variantId?: string | null) => void;
  applyDiscount: (code: string) => boolean;
  clearDiscount: () => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      discountCode: '',
      discountPercent: 0,
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (entry) =>
              entry.productId === item.productId &&
              entry.recurringPlanId === item.recurringPlanId &&
              entry.variantId === item.variantId
          );

          if (!existing) {
            return { items: [...state.items, item] };
          }

          return {
            items: state.items.map((entry) =>
              entry.productId === item.productId && entry.recurringPlanId === item.recurringPlanId
              && entry.variantId === item.variantId
                ? {
                    ...entry,
                    quantity: entry.quantity + item.quantity
                  }
                : entry
            )
          };
        }),
      removeProducts: (productIds) =>
        set((state) => {
          const blockedProductIds = new Set(productIds);

          return {
            items: state.items.filter((entry) => !blockedProductIds.has(entry.productId))
          };
        }),
      removeItem: (productId, recurringPlanId, variantId = null) =>
        set((state) => ({
          items: state.items.filter(
            (entry) =>
              !(entry.productId === productId && entry.recurringPlanId === recurringPlanId && (entry.variantId ?? null) === variantId)
          )
        })),
      updateQuantity: (productId, recurringPlanId, quantity, variantId = null) =>
        set((state) => ({
          items: state.items
            .map((entry) =>
              entry.productId === productId &&
              entry.recurringPlanId === recurringPlanId &&
              (entry.variantId ?? null) === variantId
                ? { ...entry, quantity }
                : entry
            )
            .filter((entry) => entry.quantity > 0)
        })),
      applyDiscount: (code) => {
        const normalized = code.trim().toUpperCase();
        const matched = normalized.length > 0;

        set({
          discountCode: matched ? normalized : '',
          discountPercent: 0
        });

        return matched;
      },
      clearDiscount: () =>
        set({
          discountCode: '',
          discountPercent: 0
        }),
      clear: () =>
        set({
          items: [],
          discountCode: '',
          discountPercent: 0
        })
    }),
    {
      name: 'veltrix-cart'
    }
  )
);

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
