import { useState } from 'react';
import Layout from '../components/Layout';
import { incomeIllustration, initialIncome } from '../data/incomeIllustration';
import type { IncomeInputs } from '../data/incomeIllustration';
const credits = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
export default function PaymentPortal() {
  const [inputs, setInputs] = useState({ ...initialIncome });
  const output = incomeIllustration(inputs);
  const field = (key: keyof IncomeInputs, label: string, min: number, max: number, step: number) => <label key={key} className="income-control" htmlFor={`income-${key}`}>{label}<input id={`income-${key}`} type="number" min={min} max={max} step={step} value={inputs[key]} onChange={e => { const value = Number(e.target.value); setInputs({ ...inputs, [key]: Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)) }); }} /></label>;
  return <Layout title="Your Income Portal" subtitle="Explore how baseline provision and recognized contribution could work together.">
    <p className="version-notice">Illustration only. These are invented scenario values in demo credits, not an income forecast or the final NBPA. No payments are made.</p>
    <div className="income-layout"><section className="section-card"><h2>Explore a scenario</h2><p>Need means how needed the produced good or service is. Quantity and quality remain separate.</p><div className="income-fields">
      {field('baseline', 'Baseline provision', 0, 10000, 100)}{field('quantity', 'Verified output units', 0, 100, 1)}{field('need', 'Societal need multiplier', 0, 2, .1)}{field('quality', 'Quality multiplier', 0, 2, .1)}
    </div><details><summary>Explore other factors</summary><div className="income-fields">
      {field('unitCredit', 'Credits per output unit', 0, 1000, 10)}{field('scarcity', 'Scarcity multiplier', 0, 2, .1)}{field('ability', 'Ability adjustment', 0, 2, .1)}{field('ethics', 'Ethical weighting', 0, 2, .1)}{field('environment', 'Environmental weighting', 0, 2, .1)}{field('automation', 'Automation adjustment', 0, 2, .1)}{field('regional', 'Regional adjustment', 0, 2, .1)}{field('household', 'Household adjustment', 0, 2, .1)}{field('history', 'Participation adjustment', 0, 2, .1)}{field('civic', 'Civic creation recognition', 0, 5000, 100)}
    </div></details><button className="secondary-button" onClick={() => setInputs({ ...initialIncome })}>Reset scenario</button></section>
    <aside className="section-card income-result" aria-live="polite"><span className="small-label">Illustrative monthly total</span><p className="income-total">{credits(output.total)}<small>demo credits</small></p><dl><div><dt>Baseline provision</dt><dd>{credits(output.baseline)}</dd></div><div><dt>Contribution recognition</dt><dd>{credits(output.contribution)}</dd></div><div><dt>Civic creation</dt><dd>{credits(output.civic)}</dd></div></dl><p className="muted">Contribution cannot reduce the baseline in this illustration.</p></aside></div>
    <section className="section-card"><h2>What the illustration calculates</h2><p>Total = baseline + contribution + civic creation. Contribution combines output units, a demonstration credit rate, and the multipliers shown above. The demonstration caps each multiplier at 2 and contribution at 20,000 credits.</p><p className="muted">The rate, caps, defaults and time period are placeholders introduced for this demonstration. Required ability, disability adjustments, safety, criminal ethics, savings decay, inverse costs and monetary stability still need reconciliation and modeling before a final NBPA implementation.</p></section>
  </Layout>;
}
