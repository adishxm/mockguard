export interface PaymentResponse {
  status: 'SUCCESS' | 'FAILED' | 'DECLINED';
  transactionId?: string;
  error?: string;
}

export interface PaymentGateway {
  charge(amount: number): Promise<PaymentResponse>;
}

export interface EventBus {
  publish(eventName: string, payload: Record<string, unknown>): void;
}

export interface CheckoutResult {
  orderId: string;
  status: 'CONFIRMED' | 'REJECTED';
  amount: number;
  transactionId?: string;
  isFulfilled: boolean;
}

export class CheckoutService {
  public orderStatus: 'PENDING' | 'PAID' | 'FAILED' = 'PENDING';

  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly eventBus?: EventBus
  ) {}

  /**
   * Processes checkout for an order.
   *
   * Business Rules:
   * 1. Amounts <= 0 are rejected with an error.
   * 2. Delegates charging to the external PaymentGateway.
   * 3. On successful payment with transaction ID:
   *    - Updates orderStatus to 'PAID'
   *    - Emits 'ORDER_FULFILLED' event
   *    - Returns status 'CONFIRMED' with isFulfilled = true
   * 4. On payment failure:
   *    - Updates orderStatus to 'FAILED'
   *    - Returns status 'REJECTED' with isFulfilled = false
   */
  public async checkout(orderId: string, amount: number): Promise<CheckoutResult> {
    if (amount <= 0) {
      throw new Error(`Invalid checkout amount: ${amount}`);
    }

    const payment = await this.paymentGateway.charge(amount);

    if (payment.status === 'SUCCESS' && payment.transactionId) {
      this.orderStatus = 'PAID';

      if (this.eventBus) {
        this.eventBus.publish('ORDER_FULFILLED', {
          orderId,
          amount,
          transactionId: payment.transactionId,
        });
      }

      return {
        orderId,
        status: 'CONFIRMED',
        amount,
        transactionId: payment.transactionId,
        isFulfilled: true,
      };
    }

    this.orderStatus = 'FAILED';
    return {
      orderId,
      status: 'REJECTED',
      amount,
      isFulfilled: false,
    };
  }
}

