export type Proposal = {
  id: string;
  title: string;
  category: string;
  stage: string;
  support: number;
  summary: string;
  version: number;
  sections: { id: string; title: string; text: string }[];
};

export const proposals: Proposal[] = [
  {
    id: "P-2041",
    version: 1,
    sections: [{"id": "1", "title": "Purpose", "text": "Create stable transitional housing by adapting suitable vacant public buildings."}, {"id": "2", "title": "Local delivery", "text": "Local teams will assess safety, accessibility, conversion costs, and access to essential services before selecting a building."}, {"id": "3", "title": "Public review", "text": "Publish project costs and occupancy outcomes for public review every six months."}],
    title: "Convert Vacant Public Buildings Into Transitional Housing",
    category: "Housing",
    stage: "Line-by-line voting",
    support: 78,
    summary: "Repurpose unused public buildings into modular housing with local service hubs."
  },
  {
    id: "P-2038",
    version: 1,
    sections: [{"id": "1", "title": "Purpose", "text": "Establish regional food reserves to reduce disruption during shortages."}, {"id": "2", "title": "Stewardship", "text": "Support soil restoration and publish reserve levels without exposing personal household data."}, {"id": "3", "title": "Emergency access", "text": "Publish emergency release criteria and review reserve performance annually."}],
    title: "Regional Food Stability Buffer and Soil Restoration Fund",
    category: "Food Systems",
    stage: "Public revision",
    support: 66,
    summary: "Creates reserve capacity, regenerative incentives, and transparent emergency triggers."
  },
  {
    id: "P-2045",
    version: 1,
    sections: [{"id": "1", "title": "Purpose", "text": "Offer optional AI-assisted proposal summaries alongside the complete original text."}, {"id": "2", "title": "Counterpoints", "text": "Show objections, uncertainty, and minority concerns with references to the relevant proposal sections."}, {"id": "3", "title": "Human authority", "text": "People retain all voting authority. Summaries can be challenged and corrected through a visible review process."}],
    title: "AI-Assisted Policy Summaries and Counterpoint Engine",
    category: "Governance",
    stage: "Simulation",
    support: 81,
    summary: "Uses transparent AI summaries to surface tradeoffs, objections, and minority concerns."
  }
];