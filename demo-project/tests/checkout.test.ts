import { checkout } from '../src/checkout.js';

describe('Payment & Order Checkout (Weak AI-Generated Test)', () => {
  test('processes successful payment', () => {
    // ⚠️ THE MOCK ILLUSION:
    // AI generated a mock payment function and only asserts that it was called!
    // Zero assertions on checkout() return value, orderStatus, or fulfillmentEvent!
    const payment = jest.fn().mockReturnValue({
      status: 'SUCCESS',
    });

    payment();

    expect(payment).toHaveBeenCalled();
  });
});
