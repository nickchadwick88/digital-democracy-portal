import { useState } from "react";
import type { ReactNode } from "react";
import { ParticipationContext } from "./ParticipationContext";
import { addVote, emptyParticipation, parseParticipation, storageKey } from "../data/participation";
import type { Participation, VoteChoice } from "../data/participation";
export default function ParticipationProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try { return { state: parseParticipation(localStorage.getItem(storageKey)), error: "" }; }
    catch { return { state: emptyParticipation(), error: "Saved demo data could not be read. Voting is paused to protect your existing data. Use a fresh browser profile to try the demo." }; }
  });
  const [state, setState] = useState(initial.state);
  const [error, setError] = useState(initial.error);
  function save(next: Participation) {
    if (initial.error) return false;
    try {
      const stored = parseParticipation(localStorage.getItem(storageKey));
      if (JSON.stringify(stored) !== JSON.stringify(state)) {
        setState(stored);
        setError("This demo was changed in another tab. The latest data is now loaded; review it and try again.");
        return false;
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
      setState(next); setError(""); return true;
    } catch { setError("Your change could not be saved on this device. Please allow browser storage and try again."); return false; }
  }
  function castVote(proposalId: string, version: number, choice: VoteChoice) {
    return save(addVote(state, proposalId, version, choice));
  }
  function suggest(proposalId: string, version: number, sectionId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 2000) return false;
    return save({ ...state, suggestions: [...state.suggestions, { id: crypto.randomUUID(), proposalId, version, sectionId, text: trimmed, at: new Date().toISOString() }] });
  }
  return <ParticipationContext value={{ state, error, castVote, suggest }}>{children}</ParticipationContext>;
}
