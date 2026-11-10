export type LawAnchor = { sourceId: string; textHash: string; citation: string; release: string; sourceUrl: string; amendmentId: string; amendmentVersion: number };
export function validLawAnchor(value: unknown): value is LawAnchor {
  if (typeof value !== 'object' || !value) return false;
  const v = value as Record<string, unknown>;
  if (!['sourceId', 'textHash', 'citation', 'release', 'sourceUrl', 'amendmentId'].every(k => typeof v[k] === 'string' && v[k].length > 0 && v[k].length <= 1000)) return false;
  if (!/^[a-f0-9]{64}$/.test(String(v.textHash)) || !Number.isInteger(v.amendmentVersion) || Number(v.amendmentVersion) < 1) return false;
  try { const url = new URL(String(v.sourceUrl)); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
