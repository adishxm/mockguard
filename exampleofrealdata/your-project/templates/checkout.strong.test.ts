import { CheckoutService, PaymentGateway, EventBus } from '../src/services/checkout.js';

describe('CheckoutService (Strong Behavioral Test)', () => {
  let paymentMock: any;
  let eventMock: any;
  let service: CheckoutService;

  beforeEach(() => {
    paymentMock = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      transactionId: 'txn-12345',
    });
    eventMock = jest.fn();

    const paymentGateway: PaymentGateway = {
      charge: paymentMock,
    };
    const eventBus: EventBus = {
      publish: eventMock,
    };

    service = new CheckoutService(paymentGateway, eventBus);
  });

  test('confirms an order after successful payment', async () => {
    const result = await service.checkout('order-100', 100);

    // ✅ STRONG BEHAVIORAL ASSERTIONS:
    // 1. Verify observable return outcome
    expect(result.status).toBe('CONFIRMED');
    expect(result.isFulfilled).toBe(true);
    expect(result.transactionId).toBe('txn-12345');

    // 2. Verify state transition on SUT
    expect(service.orderStatus).toBe('PAID');

    // 3. Verify interaction with dependency
    expect(paymentMock).toHaveBeenCalledWith(100);

    // 4. Verify domain event side effect
    expect(eventMock).toHaveBeenCalledWith('ORDER_FULFILLED', {
      orderId: 'order-100',
      amount: 100,
      transactionId: 'txn-12345',
    });
  });

  test('rejects orders with non-positive amount at boundary and accepts minimum valid amount', async () => {
    await expect(service.checkout('order-invalid', 0)).rejects.toThrow('Invalid checkout amount: 0');
    await expect(service.checkout('order-neg', -10)).rejects.toThrow('Invalid checkout amount: -10');
    expect(service.orderStatus).toBe('PENDING');

    // Boundary check: Minimum valid amount ($1) must succeed
    const minOrder = await service.checkout('order-min', 1);
    expect(minOrder.status).toBe('CONFIRMED');
    expect(minOrder.amount).toBe(1);
    expect(service.orderStatus).toBe('PAID');
  });

  test('handles declined payment gracefully', async () => {
    paymentMock.mockResolvedValue({
      status: 'DECLINED',
      error: 'Insufficient funds',
    });

    const result = await service.checkout('order-declined', 50);

    expect(result.status).toBe('REJECTED');
    expect(result.isFulfilled).toBe(false);
    expect(service.orderStatus).toBe('FAILED');
    expect(eventMock).not.toHaveBeenCalled();
  });
});
