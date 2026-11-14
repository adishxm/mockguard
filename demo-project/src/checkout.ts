export interface CheckoutResult {
  orderStatus: 'CONFIRMED' | 'CANCELLED';
  fulfillmentEvent: boolean;
}

export function checkout(paymentStatus: string): CheckoutResult {
  if (paymentStatus === "SUCCESS") {
    return {
      orderStatus: "CONFIRMED",
      fulfillmentEvent: true,
    };
  }

  return {
    orderStatus: "CANCELLED",
    fulfillmentEvent: false,
  };
}

