import { createContext, useContext } from "react";
import type { Participation, VoteChoice } from "../data/participation";
export type ParticipationContextValue = {
  state: Participation;
  error: string;
  castVote: (proposalId: string, version: number, choice: VoteChoice) => boolean;
  suggest: (proposalId: string, version: number, sectionId: string, text: string) => boolean;
};
export const ParticipationContext = createContext<ParticipationContextValue | null>(null);
export function useParticipation() {
  const context = useContext(ParticipationContext);
  if (!context) throw new Error("Participation provider is missing");
  return context;
}
