type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

async function loadRazorpayCheckoutScript() {
  if (window.Razorpay) {
    return;
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
      document.body.appendChild(script);
    });
  }

  await razorpayScriptPromise;
}

export async function openRazorpayCheckout(input: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  merchantName: string;
  description: string;
  customer: {
    name: string;
    email: string | null;
    contact: string | null;
  };
}) {
  await loadRazorpayCheckoutScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay checkout is unavailable.');
  }

  const RazorpayCheckout = window.Razorpay;

  return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
    const checkout = new RazorpayCheckout({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: input.merchantName,
      description: input.description,
      order_id: input.orderId,
      prefill: {
        name: input.customer.name,
        email: input.customer.email ?? undefined,
        contact: input.customer.contact ?? undefined
      },
      theme: {
        color: '#059669'
      },
      modal: {
        ondismiss: () => reject(new Error('Payment was cancelled.'))
      },
      handler: (response) => resolve(response)
    });

    checkout.on('payment.failed', (response) => {
      reject(new Error(response.error?.description ?? 'Payment failed.'));
    });

    checkout.open();
  });
}
