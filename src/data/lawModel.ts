export type LawRecord = {
  id: string; title: string; jurisdiction: string; citation: string; topic: string;
  effectiveDate: string; sourceUrl: string; sourceFileName: string;
  originalText: string; sourceSha256: string; importedAt: string;
  method: 'Pasted text' | 'Text file' | 'PDF text' | 'OCR scan';
  reviewStatus: 'Needs review' | 'Transcription reviewed';
  sections: { id: string; heading: string; text: string }[];
};
export type LawInput = Pick<LawRecord, 'title' | 'jurisdiction' | 'citation' | 'topic' | 'effectiveDate' | 'sourceUrl' | 'sourceFileName' | 'originalText' | 'method'>;
export const lawStorageKey = 'digital-democracy.laws.v1';
export async function textHash(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}
export function validateLawInput(input: LawInput): string {
  if (input.title.trim().length < 3 || input.title.length > 160) return 'Use a title between 3 and 160 characters.';
  if (!input.jurisdiction.trim() || input.jurisdiction.length > 160) return 'Specify the jurisdiction in 160 characters or fewer.';
  if (!input.citation.trim() || input.citation.length > 160) return 'Provide a source citation or document reference.';
  if (input.topic.length > 120) return 'Use a topic shorter than 120 characters.';
  if (input.originalText.trim().length < 20 || input.originalText.length > 200000) return 'Import between 20 and 200,000 characters of source text.';
  if (input.effectiveDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate) || Number.isNaN(Date.parse(input.effectiveDate)) || new Date(input.effectiveDate).toISOString().slice(0, 10) !== input.effectiveDate)) return 'Use a valid effective date or leave it unknown.';
  if (input.sourceUrl) {
    try { const url = new URL(input.sourceUrl); if (url.protocol !== 'https:' || url.username || url.password) return 'Use an HTTPS source URL without embedded credentials.'; }
    catch { return 'Use a complete HTTPS source URL.'; }
  }
  return '';
}
export function lawSections(originalText: string): LawRecord['sections'] {
  const normalized = originalText.replace(/\r\n/g, '\n');
  const parts = normalized.split(/\n(?=(?:Section|SEC\.|§|Article)\s)/i).filter(s => s.trim());
  return parts.map((text, index) => ({ id: 'section-' + (index + 1), heading: parts.length > 1 ? text.split('\n')[0].slice(0, 140) : 'Full source text', text }));
}
export async function digitizeLaw(input: LawInput): Promise<LawRecord> {
  const error = validateLawInput(input); if (error) throw new Error(error);
  return { ...input, title: input.title.trim(), jurisdiction: input.jurisdiction.trim(), citation: input.citation.trim(), topic: input.topic.trim(),
    id: crypto.randomUUID(), sourceSha256: await textHash(input.originalText), importedAt: new Date().toISOString(), reviewStatus: 'Needs review', sections: lawSections(input.originalText) };
}
export function lawIdentity(law: LawRecord) { return law.jurisdiction.toLowerCase().trim() + '|' + law.citation.toLowerCase().trim() + '|' + law.sourceSha256; }
export async function readLawBackup(raw: string): Promise<LawRecord[]> {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || !value || !('format' in value) || value.format !== 'digital-democracy-law-library' || !('version' in value) || value.version !== 1 || !('records' in value) || !Array.isArray(value.records) || value.records.length > 1000) throw new Error('Choose a law-library backup exported by this app.');
  const records: LawRecord[] = [];
  for (const item of value.records) {
    if (typeof item !== 'object' || !item || !['id', 'title', 'jurisdiction', 'citation', 'topic', 'effectiveDate', 'sourceUrl', 'sourceFileName', 'originalText', 'sourceSha256', 'importedAt', 'method', 'reviewStatus'].every(k => typeof item[k] === 'string')) throw new Error('The backup contains an invalid law record.');
    if (!['Pasted text', 'Text file', 'PDF text', 'OCR scan'].includes(item.method) || !['Needs review', 'Transcription reviewed'].includes(item.reviewStatus) || !Number.isFinite(Date.parse(item.importedAt)) || validateLawInput(item)) throw new Error('The backup contains invalid source metadata.');
    if (await textHash(item.originalText) !== item.sourceSha256) throw new Error('A source checksum does not match its text. Review the original document before importing.');
    records.push({ ...item, sections: lawSections(item.originalText) });
  }
  if (new Set(records.map(r => r.id)).size !== records.length) throw new Error('The backup contains duplicate record IDs.');
  return records;
}
