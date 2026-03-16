export type PaymentProfile = {
  citizen: string;
  needScore: number;
  contributionScore: number;
  abilityAdjustment: number;
  environmentalAdjustment: number;
  projectedPayment: number;
};

export const paymentProfile: PaymentProfile = {
  citizen: "Citizen Profile",
  needScore: 82,
  contributionScore: 71,
  abilityAdjustment: 12,
  environmentalAdjustment: -4,
  projectedPayment: 3226
};