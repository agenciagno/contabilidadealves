/**
 * Returns the effective amount for a transaction based on its payment status.
 * - If paid and paid_amount exists → use paid_amount
 * - Otherwise → use original amount
 */
export function getEffectiveAmount(t: { is_paid: boolean; amount: number; paid_amount: number | null }): number {
  return t.is_paid && t.paid_amount != null ? Number(t.paid_amount) : Number(t.amount);
}
