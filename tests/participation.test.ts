import assert from 'node:assert/strict';
import test from 'node:test';
import { addVote, emptyParticipation, latestVote, parseParticipation } from '../src/data/participation.ts';

test('changing a vote preserves history and leaves one current choice per version', () => {
  const first = addVote(emptyParticipation(), 'P-2041', 1, 'Support');
  const changed = addVote(first, 'P-2041', 1, 'Oppose');
  assert.equal(changed.votes.length, 2);
  assert.equal(changed.votes[0].choice, 'Support');
  assert.equal(latestVote(changed.votes, 'P-2041', 1)?.choice, 'Oppose');
  assert.equal(addVote(changed, 'P-2041', 1, 'Oppose').votes.length, 2);
  assert.equal(latestVote(changed.votes, 'P-2041', 2), undefined);
  assert.deepEqual(parseParticipation(JSON.stringify(changed)), changed);
});

test('invalid saved data cannot silently replace a participant record', () => {
  assert.deepEqual(parseParticipation(null), emptyParticipation());
  assert.throws(() => parseParticipation('{broken'));
  assert.throws(() => parseParticipation('{"votes":[{"id":"x","choice":"Support"}],"suggestions":[]}'));
  assert.throws(() => parseParticipation('{"votes":[],"suggestions":[{"text":5}]}'));
});
