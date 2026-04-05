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
  removeItem: (
    productId: string,
    recurringPlanId: string | null,
    variantId?: string | null,
  ) => void;
  updateQuantity: (
    productId: string,
    recurringPlanId: string | null,
    quantity: number,
    variantId?: string | null,
  ) => void;
  applyDiscount: (code: string) => boolean;
  clearDiscount: () => void;
  clear: () => void;
};

type CartSnapshot = Pick<CartState, 'items' | 'discountCode' | 'discountPercent'>;

const guestCartStorageKey = 'veltrix-cart:guest';
const guestCartTouchedKey = 'veltrix-cart:guest-touched';
const pendingSignupTransferKey = 'veltrix-cart:pending-signup-transfer';
const emptyCartState: CartSnapshot = {
  items: [],
  discountCode: '',
  discountPercent: 0,
};

let activeCartStorageKey = guestCartStorageKey;

function cartStorageKeyForUser(userId: string) {
  return `veltrix-cart:user:${userId}`;
}

function cloneCartSnapshot(state: CartSnapshot): CartSnapshot {
  return {
    items: [...state.items],
    discountCode: state.discountCode,
    discountPercent: state.discountPercent,
  };
}

function readCartSnapshot() {
  return cloneCartSnapshot(useCartStore.getState());
}

function syncGuestCartTouchState(state: CartSnapshot) {
  if (typeof window === 'undefined' || activeCartStorageKey !== guestCartStorageKey) {
    return;
  }

  if (state.items.length > 0) {
    window.sessionStorage.setItem(guestCartTouchedKey, '1');
    return;
  }

  window.sessionStorage.removeItem(guestCartTouchedKey);
}

function hasPersistedCart(storageKey: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(storageKey) !== null;
}

function setCartSnapshot(state: CartSnapshot) {
  useCartStore.setState(cloneCartSnapshot(state));
}

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
              entry.variantId === item.variantId,
          );

          if (!existing) {
            const nextState = { items: [...state.items, item] };
            syncGuestCartTouchState({ ...state, ...nextState });
            return nextState;
          }

          const nextState = {
            items: state.items.map((entry) =>
              entry.productId === item.productId &&
              entry.recurringPlanId === item.recurringPlanId &&
              entry.variantId === item.variantId
                ? {
                    ...entry,
                    quantity: entry.quantity + item.quantity,
                  }
                : entry,
            ),
          };
          syncGuestCartTouchState({ ...state, ...nextState });
          return nextState;
        }),
      removeProducts: (productIds) =>
        set((state) => {
          const blockedProductIds = new Set(productIds);
          const nextState = {
            items: state.items.filter((entry) => !blockedProductIds.has(entry.productId)),
          };
          syncGuestCartTouchState({ ...state, ...nextState });
          return nextState;
        }),
      removeItem: (productId, recurringPlanId, variantId = null) =>
        set((state) => {
          const nextState = {
            items: state.items.filter(
              (entry) =>
                !(
                  entry.productId === productId &&
                  entry.recurringPlanId === recurringPlanId &&
                  (entry.variantId ?? null) === variantId
                ),
            ),
          };
          syncGuestCartTouchState({ ...state, ...nextState });
          return nextState;
        }),
      updateQuantity: (productId, recurringPlanId, quantity, variantId = null) =>
        set((state) => {
          const nextState = {
            items: state.items
              .map((entry) =>
                entry.productId === productId &&
                entry.recurringPlanId === recurringPlanId &&
                (entry.variantId ?? null) === variantId
                  ? { ...entry, quantity }
                  : entry,
              )
              .filter((entry) => entry.quantity > 0),
          };
          syncGuestCartTouchState({ ...state, ...nextState });
          return nextState;
        }),
      applyDiscount: (code) => {
        const normalized = code.trim().toUpperCase();
        const matched = normalized.length > 0;

        const nextState = {
          discountCode: matched ? normalized : '',
          discountPercent: 0,
        };

        set(nextState);
        syncGuestCartTouchState({ ...useCartStore.getState(), ...nextState });

        return matched;
      },
      clearDiscount: () =>
        set((state) => {
          const nextState = {
            discountCode: '',
            discountPercent: 0,
          };
          syncGuestCartTouchState({ ...state, ...nextState });
          return nextState;
        }),
      clear: () =>
        set((state) => {
          syncGuestCartTouchState({ ...state, ...emptyCartState });
          return emptyCartState;
        }),
    }),
    {
      name: guestCartStorageKey,
    },
  ),
);

export function hasCurrentSessionGuestCart() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.sessionStorage.getItem(guestCartTouchedKey) === '1' &&
    useCartStore.getState().items.length > 0
  );
}

export function clearPendingSignupCartTransfer() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(pendingSignupTransferKey);
}

export function clearGuestCartStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(guestCartStorageKey);
  window.sessionStorage.removeItem(guestCartTouchedKey);
  clearPendingSignupCartTransfer();
}

export function finalizeGuestCartForSignup() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (hasCurrentSessionGuestCart()) {
    window.sessionStorage.setItem(pendingSignupTransferKey, '1');
    return true;
  }

  clearGuestCartStorage();
  if (activeCartStorageKey === guestCartStorageKey) {
    setCartSnapshot(emptyCartState);
  }

  return false;
}

function consumePendingSignupTransfer() {
  if (typeof window === 'undefined') {
    return false;
  }

  const shouldTransfer = window.sessionStorage.getItem(pendingSignupTransferKey) === '1';
  clearPendingSignupCartTransfer();
  return shouldTransfer;
}

export async function activateUserCart(
  userId: string,
  options?: { transferPendingSignupCart?: boolean },
) {
  const shouldTransfer = options?.transferPendingSignupCart
    ? consumePendingSignupTransfer()
    : false;
  const guestSnapshot = shouldTransfer ? readCartSnapshot() : null;
  const nextStorageKey = cartStorageKeyForUser(userId);

  activeCartStorageKey = nextStorageKey;
  useCartStore.persist.setOptions({ name: nextStorageKey });

  if (shouldTransfer && guestSnapshot?.items.length) {
    setCartSnapshot(guestSnapshot);
  } else if (hasPersistedCart(nextStorageKey)) {
    await useCartStore.persist.rehydrate();
  } else {
    setCartSnapshot(emptyCartState);
  }

  clearGuestCartStorage();
}

export async function activateGuestCart(options?: { clearGuestCart?: boolean }) {
  activeCartStorageKey = guestCartStorageKey;
  useCartStore.persist.setOptions({ name: guestCartStorageKey });

  if (options?.clearGuestCart) {
    clearGuestCartStorage();
    setCartSnapshot(emptyCartState);
    return;
  }

  if (hasPersistedCart(guestCartStorageKey)) {
    await useCartStore.persist.rehydrate();
  } else {
    setCartSnapshot(emptyCartState);
  }
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}
