import { OrderService, PaymentGateway, EventEmitter } from './order-service.js';

/**
 * ✅ STRONG BEHAVIORAL TEST FIXTURE
 * 
 * Verifies observable business outcomes and state invariant transitions:
 * 1. Post-condition state: order.status becomes 'PAID' and transactionId is stored.
 * 2. Emitted side effects: 'ORDER_FULFILLED' event emitted with exact payload.
 * 3. Contract invariants: negative/zero amount rejected; duplicate payment rejected.
 * 
 * If ANY business mutant is introduced, this test fails immediately.
 * The mutant is KILLED!
 */
describe('OrderService (Strong Behavioral Test)', () => {
  let mockCharge: jest.Mock;
  let mockGateway: PaymentGateway;
  let emittedEvents: Array<{ event: string; payload: unknown }>;
  let mockEvents: EventEmitter;
  let service: OrderService;

  beforeEach(() => {
    mockCharge = jest.fn().mockResolvedValue({ success: true, transactionId: 'txn-999' });
    mockGateway = { charge: mockCharge };
    emittedEvents = [];
    mockEvents = {
      emit: (event, payload) => emittedEvents.push({ event, payload }),
    };
    service = new OrderService(mockGateway, mockEvents);
  });

  it('transitions to PAID and emits ORDER_FULFILLED event upon successful charge', async () => {
    const success = await service.processOrder('order-101', 150);

    // 1. Assert return value
    expect(success).toBe(true);

    // 2. Assert observable state change on SUT
    expect(service.status).toBe('PAID');
    expect(service.transactionId).toBe('txn-999');

    // 3. Assert emitted domain event
    expect(emittedEvents).toHaveLength(1);
    expect(emittedEvents[0]).toEqual({
      event: 'ORDER_FULFILLED',
      payload: { orderId: 'order-101', amount: 150, transactionId: 'txn-999' },
    });
  });

  it('rejects invalid or non-positive amounts at boundary', async () => {
    await expect(service.processOrder('order-102', 0)).rejects.toThrow('Invalid order amount: 0');
    await expect(service.processOrder('order-103', -25)).rejects.toThrow('Invalid order amount: -25');
    expect(service.status).toBe('PENDING');
    expect(emittedEvents).toHaveLength(0);
  });

  it('prevents duplicate payment on already-paid orders', async () => {
    await service.processOrder('order-104', 100);
    expect(service.status).toBe('PAID');

    await expect(service.processOrder('order-104', 100)).rejects.toThrow(
      'Order order-104 has already been paid.'
    );
  });
});
