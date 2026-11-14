export interface PaymentGateway {
  charge(amount: number): Promise<{ success: boolean; transactionId?: string }>;
}

export interface EventEmitter {
  emit(event: string, payload: unknown): void;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED';

export class OrderService {
  public status: OrderStatus = 'PENDING';
  public isFulfilled: boolean = false;
  public transactionId?: string;

  constructor(
    private readonly gateway: PaymentGateway,
    private readonly events: EventEmitter
  ) {}

  /**
   * Processes payment for an order.
   *
   * Business Rules:
   * 1. Invalid amounts (<= 0) throw an Error immediately.
   * 2. Already processed orders (PAID) cannot be processed again (duplicate payment prevention).
   * 3. If payment succeeds, status becomes 'PAID' and 'ORDER_FULFILLED' event is emitted.
   * 4. If payment fails, status becomes 'FAILED' and NO fulfillment event is emitted.
   */
  public async processOrder(orderId: string, amount: number): Promise<boolean> {
    if (amount <= 0) {
      throw new Error(`Invalid order amount: ${amount}`);
    }

    if (this.status === 'PAID') {
      throw new Error(`Order ${orderId} has already been paid.`);
    }

    const result = await this.gateway.charge(amount);

    if (result.success && result.transactionId) {
      this.status = 'PAID';
      this.isFulfilled = true;
      this.transactionId = result.transactionId;
      this.events.emit('ORDER_FULFILLED', { orderId, amount, transactionId: result.transactionId });
      return true;
    }

    this.status = 'FAILED';
    return false;
  }
}
