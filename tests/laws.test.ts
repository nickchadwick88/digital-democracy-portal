import assert from 'node:assert/strict';
import test from 'node:test';
import { digitizeLaw, lawIdentity, lawSections, readLawBackup, textHash, validateLawInput } from '../src/data/lawModel.ts';
const input = { title: 'Example rule for testing', jurisdiction: 'Demonstration jurisdiction', citation: 'DEMO-1', topic: 'Testing', effectiveDate: '', sourceUrl: 'https://example.org/source', sourceFileName: '', originalText: 'Section 1\nThis is synthetic text for testing.\nSection 2\nKeep exact source wording.', method: 'Pasted text' as const };
test('digitization preserves the exact text and marks it for review', async () => {
  const law = await digitizeLaw(input);
  assert.equal(law.originalText, input.originalText);
  assert.equal(law.sourceSha256, await textHash(input.originalText));
  assert.equal(law.reviewStatus, 'Needs review');
  assert.equal(law.sections.length, 2);
  assert.equal(lawSections(input.originalText)[0].text, 'Section 1\nThis is synthetic text for testing.');
});
test('source metadata rejects unsafe links, impossible dates and missing citations', () => {
  assert.ok(validateLawInput({ ...input, sourceUrl: 'javascript:alert(1)' }));
  assert.ok(validateLawInput({ ...input, effectiveDate: '2026-02-30' }));
  assert.ok(validateLawInput({ ...input, citation: '' }));
  assert.equal(validateLawInput(input), '');
});
test('library backups round trip and cannot silently alter source wording', async () => {
  const law = await digitizeLaw(input);
  const wrapper = { format: 'digital-democracy-law-library', version: 1, records: [law] };
  const restored = await readLawBackup(JSON.stringify(wrapper));
  assert.deepEqual(restored, [law]);
  assert.equal(lawIdentity(restored[0]), lawIdentity(law));
  await assert.rejects(() => readLawBackup(JSON.stringify({ ...wrapper, records: [{ ...law, originalText: law.originalText + ' changed' }] })), /checksum/);
  await assert.rejects(() => readLawBackup('{"format":"wrong","records":[]}'));
});
