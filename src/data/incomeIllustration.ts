export type IncomeInputs = { baseline: number; unitCredit: number; quantity: number; need: number; quality: number; scarcity: number; ability: number; ethics: number; environment: number; automation: number; regional: number; household: number; history: number; civic: number };
export const initialIncome: IncomeInputs = { baseline: 2400, unitCredit: 100, quantity: 12, need: 1.2, quality: 1, scarcity: 1, ability: 1, ethics: 1, environment: 1, automation: 1, regional: 1, household: 1, history: 1, civic: 0 };
export function incomeIllustration(input: IncomeInputs) {
  const safe = (x: number) => Number.isFinite(x) ? Math.max(0, x) : 0;
  const baseline = safe(input.baseline);
  const contribution = Math.min(20000, safe(input.unitCredit) * safe(input.quantity) * ['need', 'quality', 'scarcity', 'ability', 'ethics', 'environment', 'automation', 'regional', 'household', 'history'].reduce((v, key) => v * Math.min(2, safe(input[key as keyof IncomeInputs])), 1));
  const civic = safe(input.civic);
  return { baseline, contribution, civic, total: baseline + contribution + civic };
}
