import { createContext, useContext } from 'react';
import type { Participation, Preferences, SectionChoice, VoteChoice } from '../data/participation';
import type { Proposal } from '../data/proposals';
import type { ProposalDraft } from '../data/proposalModel';
export type ParticipationContextValue = {
  state: Participation;
  error: string;
  dataReady: boolean;
  castVote: (proposalId: string, version: number, choice: VoteChoice) => boolean;
  suggest: (proposalId: string, version: number, sectionId: string, text: string, quote?: string) => boolean;
  reviewSection: (proposalId: string, version: number, sectionId: string, choice: SectionChoice) => boolean;
  saveDraft: (draft: ProposalDraft) => boolean;
  submitDraft: (draft: ProposalDraft) => string | null;
  revise: (base: Proposal, expectedVersion: number, sections: Proposal['sections'], note: string) => boolean;
  setPreferences: (preferences: Preferences) => boolean;
  restore: (next: Participation) => boolean;
};
export const ParticipationContext = createContext<ParticipationContextValue | null>(null);
export function useParticipation() {
  const context = useContext(ParticipationContext);
  if (!context) throw new Error('Participation provider is missing');
  return context;
}
