export type LawBoundaries = { source_url: string; year: number; scale: string; features: { name: string; abbreviation: string; rings: number[][][] }[] };
type Frame = { id: string; west: number; east: number; south: number; north: number; x: number; y: number; width: number; height: number };
const frames: Frame[] = [
  { id: 'mainland', west: -125, east: -66, south: 24, north: 50, x: 10, y: 10, width: 720, height: 400 },
  { id: 'Alaska', west: -180, east: -129, south: 51, north: 72, x: 20, y: 425, width: 200, height: 120 },
  { id: 'Hawaii', west: -161, east: -154, south: 18, north: 23, x: 260, y: 450, width: 140, height: 85 },
];
function path(rings: number[][][], frame: Frame) {
  return rings.filter(ring => ring.every(([lon, lat]) => lon >= frame.west && lon <= frame.east && lat >= frame.south && lat <= frame.north))
    .map(ring => ring.map(([lon, lat], i) => (i ? 'L' : 'M') + (frame.x + (lon - frame.west) / (frame.east - frame.west) * frame.width).toFixed(2) + ',' + (frame.y + (frame.north - lat) / (frame.north - frame.south) * frame.height).toFixed(2)).join(' ') + 'Z').join(' ');
}
export default function LawCoverageMap({ data, selected, select }: { data: LawBoundaries; selected: string; select: (value: string) => void }) {
  return <figure className="law-map"><svg viewBox="0 0 750 560" aria-labelledby="law-map-title law-map-desc">
    <title id="law-map-title">State-law collection coverage</title><desc id="law-map-desc">Census state boundaries. All state statutory collections are currently uncollected and shown in gray. Alaska and Hawaii are separate insets. Federal records are tracked separately.</desc>
    {frames.map(frame => <g key={frame.id}>{data.features.filter(feature => frame.id === 'mainland' ? !['Alaska', 'Hawaii'].includes(feature.name) : feature.name === frame.id).map(feature => {
      const id = feature.abbreviation || feature.name, outline = path(feature.rings, frame);
      return outline && <path key={feature.name} d={outline} fill={selected === id ? '#c8d2de' : '#e4e9ee'} stroke={selected === id ? '#183b68' : '#7d8fa3'} strokeWidth={selected === id ? 2 : .7}
        role="button" tabIndex={0} aria-label={feature.name + ': state laws not collected'} aria-pressed={selected === id} onClick={() => select(id)}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(id); } }}><title>{feature.name}: not collected</title></path>;
    })}{frame.id !== 'mainland' && <text x={frame.x} y={frame.y - 6} fontSize="14">{frame.id} inset</text>}</g>)}
    <text x="430" y="475" fontSize="13">Gray: state laws not collected</text><text x="430" y="497" fontSize="13">Federal corpus shown separately</text>
  </svg><figcaption>Source: <a href={data.source_url}>U.S. Census Bureau boundaries, {data.year}</a>, {data.scale}. Simplified outline display; inset scales differ. Territories outside these frames are not shown.</figcaption></figure>;
}
