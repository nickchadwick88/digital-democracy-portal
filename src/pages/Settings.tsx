import { useState } from 'react';
import Layout from '../components/Layout';
import { useParticipation } from '../components/ParticipationContext';
import { readBackup } from '../data/participation';
import type { Participation } from '../data/participation';

export default function Settings() {
  const { state, error, dataReady, setPreferences, restore } = useParticipation();
  const [pending, setPending] = useState<Participation | null>(null);
  const [confirmed, setConfirmed] = useState(false), [message, setMessage] = useState('');
  const [fileError, setFileError] = useState('');
  function downloadBackup() {
    const content = JSON.stringify({ format: 'digital-democracy-backup', version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `digital-democracy-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage('Backup downloaded. Keep a copy somewhere other than this device.');
  }
  return <Layout title="Settings and backups" subtitle="Make the demo comfortable to use and keep a recoverable copy of your work.">
    <div className="settings-grid"><section className="section-card"><h2>Your preferences</h2>
      <label className="check-label"><input type="checkbox" checked={state.preferences.largeText} onChange={e => setPreferences({ ...state.preferences, largeText: e.target.checked })} />Larger text</label>
      <label className="check-label"><input type="checkbox" checked={state.preferences.welcomeSound} onChange={e => setPreferences({ ...state.preferences, welcomeSound: e.target.checked })} />Enable a welcome chime on the dashboard</label>
      <p className="muted">Sound is off by default. Your browser may require a click before it can play.</p>
    </section><section className="section-card"><h2>Export your work</h2><p>Download your proposals, drafts, versions, votes, suggestions, section preferences, and settings.</p><button disabled={!dataReady} onClick={downloadBackup}>Download backup</button><p className="muted">This file contains your demo choices. Share it only with people you intend to share them with.</p></section></div>
    <section className="section-card"><h2>Restore from a backup</h2><p>Choose a backup you exported from this app. Nothing changes until you confirm the restore.</p>
      <label htmlFor="backup-file">Backup file</label><input id="backup-file" type="file" accept=".json,application/json" onChange={async e => {
        setPending(null); setConfirmed(false); setMessage(''); setFileError(''); const file = e.target.files?.[0]; if (!file) return;
        try { if (file.size > 2 * 1024 * 1024) throw new Error('Choose a backup smaller than 2 MB.'); setPending(readBackup(await file.text())); }
        catch (problem) { setFileError(problem instanceof Error ? problem.message : 'The file could not be read.'); }
      }} />
      {pending && <div className="restore-preview"><h3>Backup contents</h3><p>{pending.proposals.length} submitted proposals · {pending.drafts.length} drafts · {pending.revisions.length} revisions · {pending.votes.length} vote records · {pending.suggestions.length} suggestions</p>
        <label className="check-label"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Replace this browser's demo data with this backup</label>
        <button disabled={!confirmed} onClick={() => { if (restore(pending)) { setPending(null); setConfirmed(false); setMessage('Backup restored. Your proposals and decisions are ready.'); } }}>Restore backup</button>
      </div>}
      {fileError && <p className="error-message" role="alert">{fileError}</p>}
    </section>
    {error && <p className="error-message" role="alert">{error}</p>}<p className="inline-status" role="status">{message}</p>
    <section className="section-card"><h2>Where your data lives</h2><p>This review edition uses browser storage. It does not create an account, verify a voter, or send your decisions to a server. Another device or browser will have a separate record. Export a backup before clearing browser data or reformatting a device.</p></section>
  </Layout>;
}
