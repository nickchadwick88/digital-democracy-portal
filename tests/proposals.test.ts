import assert from 'node:assert/strict';
import test from 'node:test';
import { proposals } from '../src/data/proposals.ts';
import { addVote, emptyParticipation, latestVote, parseParticipation } from '../src/data/participation.ts';
import { appendRevision, blankDraft, publishDraft, proposalVersions } from '../src/data/proposalModel.ts';

test('submission creates a searchable published record and removes only its draft', () => {
  const draft = { ...blankDraft(), title: 'Restore local public paths', summary: 'Make local public paths easier for everyone to use.', text: 'Inspect accessibility on local public paths.\n\nPublish the results and a prioritized repair plan.' };
  const state = { ...emptyParticipation(), drafts: [draft, blankDraft()] };
  const result = publishDraft(state, draft);
  assert.equal(result.proposal.sections.length, 2);
  assert.equal(result.proposal.version, 1);
  assert.equal(result.state.drafts.length, 1);
  assert.equal(state.proposals.length, 0);
  assert.throws(() => publishDraft(result.state, draft), /already exists|already been submitted/);
  assert.throws(() => publishDraft(state, { ...draft, title: '   ' }));
  assert.deepEqual(parseParticipation(JSON.stringify(result.state)), result.state);
});

test('revisions retain original wording and bind earlier votes only to earlier versions', () => {
  const base = proposals[0];
  const initial = addVote(emptyParticipation(), base.id, 1, 'Support');
  const sections = base.sections.map((s, i) => i ? { ...s } : { ...s, text: s.text + ' Include accessible entrances.' });
  const revised = appendRevision(initial, base, 1, sections, 'Clarify accessible entrance requirements.');
  const versions = proposalVersions(revised, base);
  assert.equal(versions.length, 2);
  assert.equal(versions[0].sections[0].text, base.sections[0].text);
  assert.equal(versions[1].sections[0].text, sections[0].text);
  assert.equal(latestVote(revised.votes, base.id, 2), undefined);
  assert.equal(latestVote(revised.votes, base.id, 1)?.choice, 'Support');
  assert.throws(() => appendRevision(revised, base, 1, sections, 'Outdated base version'), /changed/);
  assert.throws(() => appendRevision(revised, base, 2, sections, 'No actual wording changes'), /Change at least/);
});
