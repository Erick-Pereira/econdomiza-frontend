// Simcag.Econdomiza.Frontend/Services/Expenses/ExpenseActionsService.tsx
import { EcondomizaApi } from '../../services';

interface PaymentRequest {
  amount: number;
  paymentDate: string;
  method: string;
  referenceCode?: string | null;
}

/**
 * Service for expense actions - extracted from ExpenseOperationalDetailPage
 * Created as part of SPRINT 1 frontend refactoring
 */
class ExpenseActionsService {
  /**
   * Loads complete expense data via API
   * Original: Lines 123-138 in ExpenseOperationalDetailPage.tsx
   */
  static async getExpense(expenseId: string): Promise<unknown> {
    try {
      const response = await EcondomizaApi.getExpense(expenseId);
      return response.data;
    } catch (error) {
      console.error('Failed to load expense:', error);
      throw new Error('Falha ao carregar despesa', { cause: error });
    }
  }

  /**
   * Approves expense via API
   * Original: Line 220 in ExpenseOperationalDetailPage.tsx
   */
  static async approveExpense(expenseId: string): Promise<void> {
    await EcondomizaApi.approveExpense(expenseId);
  }

  /**
   * Rejects expense with reason
   * Original: Lines 228-231 in ExpenseOperationalDetailPage.tsx
   */
  static async rejectExpense(expenseId: string, reason: string): Promise<void> {
    await EcondomizaApi.rejectExpense(expenseId, reason);
  }

  /**
   * Cancels expense with reason
   * Original: Lines 232-235 in ExpenseOperationalDetailPage.tsx
   */
  static async cancelExpense(expenseId: string, reason: string): Promise<void> {
    await EcondomizaApi.cancelExpense(expenseId, reason);
  }

  /**
   * Retries expense processing
   * Original: Line 239 in ExpenseOperationalDetailPage.tsx
   */
  static async retryExpenseProcessing(expenseId: string): Promise<void> {
    await EcondomizaApi.retryExpenseProcessing(expenseId);
  }

  /**
   * Registers payment (partial or full)
   * Original: Lines 241-259 in ExpenseOperationalDetailPage.tsx
   */
  static async registerPayment(expenseId: string, request: PaymentRequest): Promise<void> {
    await EcondomizaApi.registerExpensePayment(expenseId, request);
  }

  /**
   * Refunds existing payment
   * Original: Lines 261-271 in ExpenseOperationalDetailPage.tsx
   */
  static async refundPayment(expenseId: string, paymentId: string, reason: string): Promise<void> {
    await EcondomizaApi.refundExpensePayment(expenseId, paymentId, reason);
  }
}

export default ExpenseActionsService;
