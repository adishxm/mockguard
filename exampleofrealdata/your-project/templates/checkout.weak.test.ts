import { CheckoutService, PaymentGateway } from '../src/services/checkout.js';

describe('CheckoutService (Weak AI Mock Test)', () => {
  test('confirms an order after successful payment', async () => {
    const paymentMock = jest.fn().mockResolvedValue({
      status: 'SUCCESS',
      transactionId: 'txn-12345',
    });

    const paymentGateway: PaymentGateway = {
      charge: paymentMock,
    };

    const service = new CheckoutService(paymentGateway);

    await service.checkout('order-100', 100);

    // ⚠️ WEAK ASSERTION (THE FALSE-GREEN TRAP):
    // Only asserts that the mock was invoked with 100.
    // Does NOT assert on the returned status, service orderStatus, or business invariants!
    expect(paymentMock).toHaveBeenCalledWith(100);
  });
});

