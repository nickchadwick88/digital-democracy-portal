import assert from 'node:assert/strict';
import test from 'node:test';
import { validLawAnchor } from '../src/data/lawAnchor.ts';
import { publishDraft } from '../src/data/proposalModel.ts';
import { emptyParticipation, parseParticipation } from '../src/data/participation.ts';
const sourceLaw = { sourceId: 'fixture:1', textHash: 'a'.repeat(64), citation: 'Fixture § 1', release: 'fixture-v1', sourceUrl: 'https://example.org/official', amendmentId: 'draft-1', amendmentVersion: 2 };
test('source-law identity survives proposal submission and backup restoration', () => {
  const { proposal, state } = publishDraft(emptyParticipation(), { id: 'fixture', title: 'Amend fixture provision', category: 'Governance', summary: 'Change a specific source provision for review.', text: 'Replace the pinned original wording with a different proposed text.', sourceLaw });
  assert.deepEqual(proposal.sourceLaw, sourceLaw);
  assert.deepEqual(parseParticipation(JSON.stringify(state)).proposals[0].sourceLaw, sourceLaw);
  const altered = structuredClone(state); altered.proposals[0].sourceLaw!.textHash = 'invalid';
  assert.throws(() => parseParticipation(JSON.stringify(altered)));
});
test('source references reject unsafe URLs and invalid source versions', () => {
  assert.ok(validLawAnchor(sourceLaw));
  assert.equal(validLawAnchor({ ...sourceLaw, sourceUrl: 'javascript:alert(1)' }), false);
  assert.equal(validLawAnchor({ ...sourceLaw, amendmentVersion: 0 }), false);
  assert.equal(validLawAnchor({ ...sourceLaw, textHash: 'missing' }), false);
});
