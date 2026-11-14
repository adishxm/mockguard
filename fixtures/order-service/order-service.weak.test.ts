import { OrderService, PaymentGateway, EventEmitter } from './order-service.js';

/**
 * ❌ WEAK AI-GENERATED TEST FIXTURE
 * 
 * Notice the classic anti-pattern:
 * - Mocks the external dependency.
 * - Asserts ONLY that the mock was invoked.
 * - Makes ZERO assertions on real application state, postconditions, or emitted side effects.
 * 
 * If a mutant breaks the business state logic (e.g. status never changes to 'PAID'),
 * this test still passes 100% green! The mutant SURVIVES.
 */
describe('OrderService (Weak AI Mock Test)', () => {
  it('processes payment', async () => {
    const mockCharge = jest.fn().mockResolvedValue({ success: true, transactionId: 'txn-999' });
    const mockGateway: PaymentGateway = { charge: mockCharge };
    const mockEvents: EventEmitter = { emit: jest.fn() };

    const service = new OrderService(mockGateway, mockEvents);

    const result = await service.processOrder('order-123', 50);

    // ⚠️ THE MOCK ILLUSION:
    // Only asserts that the mock was called with the amount.
    // Zero checks on service.status, event emission, or business contract.
    expect(mockCharge).toHaveBeenCalledWith(50);
    expect(result).toBe(true);
  });
});
