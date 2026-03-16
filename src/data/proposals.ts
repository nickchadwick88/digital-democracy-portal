export type Proposal = {
  id: string;
  title: string;
  category: string;
  stage: string;
  support: number;
  summary: string;
};

export const proposals: Proposal[] = [
  {
    id: "P-2041",
    title: "Convert Vacant Public Buildings Into Transitional Housing",
    category: "Housing",
    stage: "Line-by-line voting",
    support: 78,
    summary: "Repurpose unused public buildings into modular housing with local service hubs."
  },
  {
    id: "P-2038",
    title: "Regional Food Stability Buffer and Soil Restoration Fund",
    category: "Food Systems",
    stage: "Public revision",
    support: 66,
    summary: "Creates reserve capacity, regenerative incentives, and transparent emergency triggers."
  },
  {
    id: "P-2045",
    title: "AI-Assisted Policy Summaries and Counterpoint Engine",
    category: "Governance",
    stage: "Simulation",
    support: 81,
    summary: "Uses transparent AI summaries to surface tradeoffs, objections, and minority concerns."
  }
];