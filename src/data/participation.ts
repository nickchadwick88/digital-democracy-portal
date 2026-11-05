import { proposals as samples } from './proposals.ts';
import type { Proposal } from './proposals.ts';
import type { ProposalDraft, Revision } from './proposalModel.ts';
export type VoteChoice = 'Support' | 'Oppose' | 'Abstain';
export type SectionChoice = 'Keep' | 'Revise' | 'Remove';
export type Vote = { id: string; proposalId: string; version: number; choice: VoteChoice; at: string };
export type Suggestion = { id: string; proposalId: string; version: number; sectionId: string; text: string; at: string; quote?: string };
export type SectionReview = { id: string; proposalId: string; version: number; sectionId: string; choice: SectionChoice; at: string };
export type Preferences = { welcomeSound: boolean; largeText: boolean };
export type Participation = { votes: Vote[]; suggestions: Suggestion[]; proposals: Proposal[]; drafts: ProposalDraft[]; revisions: Revision[]; sectionReviews: SectionReview[]; preferences: Preferences };
export const storageKey = 'digital-democracy.participation.v1';
export const emptyParticipation = (): Participation => ({ votes: [], suggestions: [], proposals: [], drafts: [], revisions: [], sectionReviews: [], preferences: { welcomeSound: false, largeText: false } });
const choices: unknown[] = ['Support', 'Oppose', 'Abstain'];
const sectionChoices: unknown[] = ['Keep', 'Revise', 'Remove'];
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const text = (v: unknown): v is string => typeof v === 'string';
const validBase = (v: Record<string, unknown>) => text(v.id) && text(v.proposalId) && Number.isInteger(v.version) && Number(v.version) > 0 && text(v.at) && Number.isFinite(Date.parse(v.at));
const validSections = (x: unknown) => Array.isArray(x) && x.length > 0 && x.every(s => record(s) && text(s.id) && text(s.title) && text(s.text)) && new Set(x.map(s => s.id)).size === x.length;
export function parseParticipation(raw: string | null): Participation {
  if (!raw) return emptyParticipation();
  const v: unknown = JSON.parse(raw);
  if (!record(v) || !Array.isArray(v.votes) || !Array.isArray(v.suggestions) ||
    !v.votes.every(x => record(x) && validBase(x) && choices.includes(x.choice)) ||
    !v.suggestions.every(x => record(x) && validBase(x) && text(x.sectionId) && text(x.text) && (x.quote === undefined || text(x.quote)))) throw new Error('Saved participation data is invalid.');
  const custom = v.proposals ?? [], drafts = v.drafts ?? [], revisions = v.revisions ?? [], reviews = v.sectionReviews ?? [];
  const preferences = v.preferences ?? emptyParticipation().preferences;
  if (!Array.isArray(custom) || !custom.every(p => record(p) && text(p.id) && text(p.title) && text(p.summary) && text(p.category) && text(p.stage) && typeof p.support === 'number' && p.version === 1 && validSections(p.sections)) ||
    !Array.isArray(drafts) || !drafts.every(d => record(d) && ['id', 'title', 'category', 'summary', 'text'].every(k => text(d[k]))) ||
    !Array.isArray(revisions) || !revisions.every(r => record(r) && validBase(r) && text(r.note) && validSections(r.sections)) ||
    !Array.isArray(reviews) || !reviews.every(r => record(r) && validBase(r) && text(r.sectionId) && sectionChoices.includes(r.choice)) ||
    !record(preferences) || typeof preferences.welcomeSound !== 'boolean' || typeof preferences.largeText !== 'boolean') throw new Error('Saved proposal data is invalid.');
  const state = { votes: v.votes, suggestions: v.suggestions, proposals: custom, drafts, revisions, sectionReviews: reviews, preferences } as Participation;
  const bases = [...samples, ...state.proposals];
  if (new Set(bases.map(p => p.id)).size !== bases.length || new Set(state.drafts.map(d => d.id)).size !== state.drafts.length) throw new Error('Duplicate proposal or draft identities.');
  const versions = new Map(bases.map(p => [p.id, [p]]));
  for (const revision of state.revisions) {
    const chain = versions.get(revision.proposalId), prior = chain?.at(-1);
    if (!prior || revision.version !== prior.version + 1 || revision.sections.length !== prior.sections.length || revision.sections.some((s, i) => s.id !== prior.sections[i].id || s.title !== prior.sections[i].title)) throw new Error('The revision history is incomplete or inconsistent.');
    chain!.push({ ...prior, version: revision.version, sections: revision.sections });
  }
  for (const entry of [...state.votes, ...state.suggestions, ...state.sectionReviews]) {
    const proposal = versions.get(entry.proposalId)?.find(p => p.version === entry.version);
    if (!proposal || ('sectionId' in entry && !proposal.sections.some(s => s.id === entry.sectionId))) throw new Error('A saved decision refers to an unavailable proposal version.');
  }
  return state;
}
export function latestVote(votes: Vote[], proposalId: string, version: number) {
  return votes.findLast(v => v.proposalId === proposalId && v.version === version);
}
export function addVote(state: Participation, proposalId: string, version: number, choice: VoteChoice): Participation {
  if (latestVote(state.votes, proposalId, version)?.choice === choice) return state;
  return { ...state, votes: [...state.votes, { id: crypto.randomUUID(), proposalId, version, choice, at: new Date().toISOString() }] };
}
export function readBackup(raw: string): Participation {
  const v: unknown = JSON.parse(raw);
  if (!record(v) || v.format !== 'digital-democracy-backup' || v.version !== 1 || !record(v.state)) throw new Error('Choose a Digital Democracy backup exported by this app.');
  return parseParticipation(JSON.stringify(v.state));
}
