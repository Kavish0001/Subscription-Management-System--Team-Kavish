import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  recurringPlanId: string | null;
  recurringPlanName: string;
  unitPrice: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  discountCode: string;
  discountPercent: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, recurringPlanId: string | null) => void;
  updateQuantity: (productId: string, recurringPlanId: string | null, quantity: number) => void;
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
              entry.productId === item.productId && entry.recurringPlanId === item.recurringPlanId
          );

          if (!existing) {
            return { items: [...state.items, item] };
          }

          return {
            items: state.items.map((entry) =>
              entry.productId === item.productId && entry.recurringPlanId === item.recurringPlanId
                ? {
                    ...entry,
                    quantity: entry.quantity + item.quantity
                  }
                : entry
            )
          };
        }),
      removeItem: (productId, recurringPlanId) =>
        set((state) => ({
          items: state.items.filter(
            (entry) =>
              !(entry.productId === productId && entry.recurringPlanId === recurringPlanId)
          )
        })),
      updateQuantity: (productId, recurringPlanId, quantity) =>
        set((state) => ({
          items: state.items
            .map((entry) =>
              entry.productId === productId && entry.recurringPlanId === recurringPlanId
                ? { ...entry, quantity }
                : entry
            )
            .filter((entry) => entry.quantity > 0)
        })),
      applyDiscount: (code) => {
        const normalized = code.trim().toUpperCase();
        const matched = normalized === 'WELCOME10';

        set({
          discountCode: matched ? normalized : '',
          discountPercent: matched ? 10 : 0
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
      name: 'subflow-cart'
    }
  )
);

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
