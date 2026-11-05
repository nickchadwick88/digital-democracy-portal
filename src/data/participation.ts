export type VoteChoice = "Support" | "Oppose" | "Abstain";
export type Vote = { id: string; proposalId: string; version: number; choice: VoteChoice; at: string };
export type Suggestion = { id: string; proposalId: string; version: number; sectionId: string; text: string; at: string };
export type Participation = { votes: Vote[]; suggestions: Suggestion[] };
export const storageKey = "digital-democracy.participation.v1";
export const emptyParticipation = (): Participation => ({ votes: [], suggestions: [] });
const choices: unknown[] = ["Support", "Oppose", "Abstain"];
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const validBase = (v: Record<string, unknown>) => typeof v.id === "string" && typeof v.proposalId === "string" && Number.isInteger(v.version) && Number(v.version) > 0 && typeof v.at === "string" && Number.isFinite(Date.parse(v.at));
export function parseParticipation(raw: string | null): Participation {
  if (!raw) return emptyParticipation();
  const v: unknown = JSON.parse(raw);
  if (!record(v) || !Array.isArray(v.votes) || !Array.isArray(v.suggestions) ||
    !v.votes.every(x => record(x) && validBase(x) && choices.includes(x.choice)) ||
    !v.suggestions.every(x => record(x) && validBase(x) && typeof x.sectionId === "string" && typeof x.text === "string")) {
    throw new Error("Saved demo data is not in a supported format.");
  }
  return v as Participation;
}
export function latestVote(votes: Vote[], proposalId: string, version: number) {
  return votes.findLast(v => v.proposalId === proposalId && v.version === version);
}
export function addVote(state: Participation, proposalId: string, version: number, choice: VoteChoice): Participation {
  if (latestVote(state.votes, proposalId, version)?.choice === choice) return state;
  return { ...state, votes: [...state.votes, { id: crypto.randomUUID(), proposalId, version, choice, at: new Date().toISOString() }] };
}
