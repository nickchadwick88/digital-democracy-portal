import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useParticipation } from '../components/ParticipationContext';
import { allProposals } from '../data/proposalModel';
import { latestVote } from '../data/participation';
async function chime() {
  const audio = new AudioContext();
  try {
    await audio.resume();
    if (audio.state !== 'running') throw new Error('A click is needed to play sound.');
    [523.25, 659.25, 783.99].forEach((frequency, i) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      const start = audio.currentTime + i * .12;
      oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.08, start + .03); gain.gain.exponentialRampToValueAtTime(.001, start + .6);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + .65);
    });
    setTimeout(() => { void audio.close(); }, 1200);
  } catch { void audio.close(); throw new Error('Your browser needs a click before playing the welcome chime.'); }
}
export default function DashboardPage() {
  const { state, error } = useParticipation();
  const [soundNotice, setSoundNotice] = useState('');
  const proposals = allProposals(state), decided = proposals.filter(p => latestVote(state.votes, p.id, p.version));
  const pending = proposals.filter(p => !latestVote(state.votes, p.id, p.version));
  useEffect(() => { if (state.preferences.welcomeSound) void chime().catch(() => setSoundNotice('Select Play welcome chime to hear your welcome sound.')); }, [state.preferences.welcomeSound]);
  return <Layout title="Your participation dashboard" subtitle="A place to understand, contribute, and help shape what comes next.">
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="stat-grid">{[[proposals.length, 'Proposals to explore'], [decided.length, 'Current versions voted on'], [state.drafts.length, 'Your saved drafts'], [state.suggestions.length, 'Wording suggestions']].map(([value, label]) => <div className="stat-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <div className="dashboard-grid"><section className="section-card"><span className="small-label">Your next decision</span><h2>{pending.length ? 'Fresh wording to consider' : 'You are up to date'}</h2><p>{pending.length ? 'These proposals have no vote from you on their latest version.' : 'You have recorded a decision on every current proposal. You can revisit any of them.'}</p>
      <ul className="dashboard-list">{pending.slice(0, 3).map(p => <li key={p.id}><Link className="action-link" to={`/proposal/${p.id}`}>{p.title}</Link><span>Version {p.version} · {p.category}</span></li>)}</ul><Link className="primary-link" to="/voting">Explore public decisions</Link>
    </section><section className="section-card"><span className="small-label">Bring an idea forward</span><h2>A better outcome can start with you.</h2><p>Create a proposal, refine its wording, and see how versioned review could work.</p><Link className="primary-link" to="/proposal/new">Create a proposal</Link>{state.drafts.length > 0 && <p><Link className="action-link" to={`/draft/${state.drafts.at(-1)!.id}`}>Continue your latest draft →</Link></p>}</section></div>
    <div className="feature-grid"><section className="section-card"><h2>Your decisions</h2><p>See your votes and how they changed, tied to the wording you reviewed.</p><Link className="action-link" to="/history">Open vote history →</Link></section><section className="section-card"><h2>Your Income Portal</h2><p>Explore an illustrative model of baseline provision and contribution recognition.</p><Link className="action-link" to="/payment">Explore income illustration →</Link></section><section className="section-card"><h2>Keep your work</h2><p>Export a backup of your drafts, revisions, and decisions before changing devices.</p><Link className="action-link" to="/settings">Settings and backups →</Link></section></div>
    {state.preferences.welcomeSound && <div><button className="secondary-button" onClick={() => void chime().then(() => setSoundNotice('Welcome chime played.')).catch(e => setSoundNotice(e.message))}>Play welcome chime</button><p role="status">{soundNotice}</p></div>}
  </Layout>;
}
