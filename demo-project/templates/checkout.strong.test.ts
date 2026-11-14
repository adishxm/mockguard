import { checkout } from '../src/checkout.js';

describe('Payment & Order Checkout (Strong Behavioral Test)', () => {
  test('confirms the order after successful payment', () => {
    // ✅ TRUE BEHAVIORAL VERIFICATION:
    // Directly executes the business logic and asserts state & domain postconditions!
    const result = checkout('SUCCESS');

    expect(result.orderStatus).toBe('CONFIRMED');
    expect(result.fulfillmentEvent).toBe(true);
  });

  test('cancels order when payment is not successful', () => {
    const result = checkout('FAILED');

    expect(result.orderStatus).toBe('CANCELLED');
    expect(result.fulfillmentEvent).toBe(false);
  });
});
