import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ParticipationContext } from './ParticipationContext';
import { addVote, emptyParticipation, parseParticipation, storageKey } from '../data/participation';
import type { Participation, Preferences, SectionChoice, VoteChoice } from '../data/participation';
import { allProposals, appendRevision, publishDraft } from '../data/proposalModel';
import type { ProposalDraft } from '../data/proposalModel';
import type { Proposal } from '../data/proposals';
export default function ParticipationProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try { return { state: parseParticipation(localStorage.getItem(storageKey)), error: '' }; }
    catch { return { state: emptyParticipation(), error: 'Saved demo data could not be read. Editing is paused to protect it. You can restore a valid backup in Settings.' }; }
  });
  const [state, setState] = useState(initial.state);
  const [error, setError] = useState(initial.error);
  const [loadFailed, setLoadFailed] = useState(Boolean(initial.error));
  useEffect(() => { document.documentElement.dataset.largeText = String(state.preferences.largeText); }, [state.preferences.largeText]);
  function save(next: Participation) {
    if (loadFailed) return false;
    try {
      const stored = parseParticipation(localStorage.getItem(storageKey));
      if (JSON.stringify(stored) !== JSON.stringify(state)) {
        setState(stored); setError('This demo changed in another tab. The latest data is loaded; review it and try again.'); return false;
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
      setState(next); setError(''); return true;
    } catch { setError('Your change could not be saved. Please allow browser storage and try again.'); return false; }
  }
  function currentProposal(proposalId: string, version: number) {
    const p = allProposals(state).find(p => p.id === proposalId && p.version === version);
    if (!p) setError('That version is no longer current. Open the latest wording before making a decision.');
    return p;
  }
  function castVote(proposalId: string, version: number, choice: VoteChoice) {
    return Boolean(currentProposal(proposalId, version)) && save(addVote(state, proposalId, version, choice));
  }
  function suggest(proposalId: string, version: number, sectionId: string, text: string, quote = '') {
    const p = currentProposal(proposalId, version), trimmed = text.trim();
    if (!p?.sections.some(s => s.id === sectionId) || !trimmed || trimmed.length > 2000 || quote.length > 2000) { setError('Use a valid section and 1 to 2,000 characters for your suggestion.'); return false; }
    return save({ ...state, suggestions: [...state.suggestions, { id: crypto.randomUUID(), proposalId, version, sectionId, text: trimmed, quote: quote.trim(), at: new Date().toISOString() }] });
  }
  function reviewSection(proposalId: string, version: number, sectionId: string, choice: SectionChoice) {
    if (!currentProposal(proposalId, version)?.sections.some(s => s.id === sectionId)) return false;
    const prior = state.sectionReviews.findLast(r => r.proposalId === proposalId && r.version === version && r.sectionId === sectionId);
    if (prior?.choice === choice) return true;
    return save({ ...state, sectionReviews: [...state.sectionReviews, { id: crypto.randomUUID(), proposalId, version, sectionId, choice, at: new Date().toISOString() }] });
  }
  function saveDraft(draft: ProposalDraft) {
    return save({ ...state, drafts: [...state.drafts.filter(d => d.id !== draft.id), { ...draft }] });
  }
  function submitDraft(draft: ProposalDraft) {
    try { const result = publishDraft(state, draft); return save(result.state) ? result.proposal.id : null; }
    catch (e) { setError(e instanceof Error ? e.message : 'Submission failed.'); return null; }
  }
  function revise(base: Proposal, expectedVersion: number, sections: Proposal['sections'], note: string) {
    try { return save(appendRevision(state, base, expectedVersion, sections, note)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Revision failed.'); return false; }
  }
  function setPreferences(preferences: Preferences) { return save({ ...state, preferences }); }
  function restore(next: Participation) {
    try {
      const verified = parseParticipation(JSON.stringify(next));
      const previous = localStorage.getItem(storageKey);
      if (previous) localStorage.setItem(`${storageKey}.before-restore`, previous);
      localStorage.setItem(storageKey, JSON.stringify(verified));
      setState(verified); setLoadFailed(false); setError(''); return true;
    } catch { setError('The backup could not be restored. Existing demo data was not changed.'); return false; }
  }
  return <ParticipationContext value={{ state, error, dataReady: !loadFailed, castVote, suggest, reviewSection, saveDraft, submitDraft, revise, setPreferences, restore }}>{children}</ParticipationContext>;
}
