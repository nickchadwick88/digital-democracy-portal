import { proposals as samples } from './proposals.ts';
import type { Proposal } from './proposals.ts';
import type { Participation } from './participation.ts';
export type ProposalDraft = { id: string; title: string; category: string; summary: string; text: string };
export type Revision = { id: string; proposalId: string; version: number; at: string; note: string; sections: Proposal['sections'] };
export const categories = ['Housing', 'Food Systems', 'Governance', 'Education', 'Healthcare', 'Transportation', 'Environment', 'Other'];
export const blankDraft = (): ProposalDraft => ({ id: crypto.randomUUID(), title: '', category: 'Other', summary: '', text: '' });
export function proposalVersions(state: Participation, base: Proposal): Proposal[] {
  return [base, ...state.revisions.filter(r => r.proposalId === base.id).map(r => ({ ...base, version: r.version, sections: r.sections }))];
}
export function allProposals(state: Participation): Proposal[] {
  return [...samples, ...state.proposals].map(p => proposalVersions(state, p).at(-1)!);
}
export function findBaseProposal(state: Participation, id: string) {
  return [...samples, ...state.proposals].find(p => p.id.toLowerCase() === id.trim().toLowerCase());
}
export function draftError(draft: ProposalDraft, state: Participation): string {
  if (draft.title.trim().length < 5 || draft.title.trim().length > 160) return 'Use a title between 5 and 160 characters.';
  if (draft.summary.trim().length < 10 || draft.summary.trim().length > 500) return 'Use a summary between 10 and 500 characters.';
  if (draft.text.trim().length < 20 || draft.text.trim().length > 10000) return 'Use proposal wording between 20 and 10,000 characters.';
  if (!categories.includes(draft.category)) return 'Choose a proposal category.';
  if (allProposals(state).some(p => p.title.trim().toLowerCase() === draft.title.trim().toLowerCase())) return 'A proposal with this title already exists. Review it before creating another.';
  return '';
}
export function publishDraft(state: Participation, draft: ProposalDraft): { state: Participation; proposal: Proposal } {
  const error = draftError(draft, state);
  if (error) throw new Error(error);
  const proposal: Proposal = {
    id: `P-LOCAL-${draft.id.toUpperCase()}`, title: draft.title.trim(), category: draft.category,
    summary: draft.summary.trim(), stage: 'Open for review', support: 0, version: 1,
    sections: draft.text.trim().split(/\n\s*\n/).map((text, i) => ({ id: `section-${i + 1}`, title: `Section ${i + 1}`, text: text.trim() })),
  };
  if (state.proposals.some(p => p.id === proposal.id)) throw new Error('This draft has already been submitted.');
  return { proposal, state: { ...state, proposals: [...state.proposals, proposal], drafts: state.drafts.filter(d => d.id !== draft.id) } };
}
export function appendRevision(state: Participation, base: Proposal, expectedVersion: number, sections: Proposal['sections'], note: string): Participation {
  const current = proposalVersions(state, base).at(-1)!;
  if (current.version !== expectedVersion) throw new Error('The proposal has changed. Open the latest version before publishing a revision.');
  if (note.trim().length < 5 || note.trim().length > 500) throw new Error('Explain the change in 5 to 500 characters.');
  if (sections.length !== current.sections.length || sections.some((s, i) => s.id !== current.sections[i].id || s.title !== current.sections[i].title || !s.text.trim() || s.text.trim().length > 10000)) throw new Error('Each section must keep its identity and contain 1 to 10,000 characters.');
  const cleaned = sections.map(s => ({ ...s, text: s.text.trim() }));
  if (cleaned.every((s, i) => s.text === current.sections[i].text)) throw new Error('Change at least one section before publishing a new version.');
  return { ...state, revisions: [...state.revisions, { id: crypto.randomUUID(), proposalId: base.id, version: current.version + 1, at: new Date().toISOString(), note: note.trim(), sections: cleaned }] };
}
