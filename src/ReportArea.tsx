import type { ShowData, ShowDance } from './utils';
import { styleColors } from './utils';
import type { GroupName } from './types';

interface Props {
  shows: ShowData[];
}

const DanceRow = ({ dance, idx }: { dance: ShowDance; idx: number }) => {
  const color = styleColors[dance.dance_style] ?? '#666';
  return (
    <tr className="report-dance-row">
      <td className="report-order">{idx + 1}</td>
      <td>
        <span className="report-group-badge">{dance.group}</span>
      </td>
      <td>
        <div style={{ color, fontWeight: 'bold' }}>{dance.dance_name}</div>
        <div className="report-song">
          {dance.song} — {dance.artist}
        </div>
        <div className="report-choreo">{dance.choreography}</div>
      </td>
      <td className="report-count">{dance.dancers.length || ''}</td>
      <td className="report-overlap">
        {dance.common_with_next.length > 0 && (
          <div className="overlap-next">
            <strong>Next:</strong> {dance.common_with_next.join(', ')}
          </div>
        )}
        {dance.common_with_next2.length > 0 && (
          <div className="overlap-next2">
            <strong>+2:</strong> {dance.common_with_next2.join(', ')}
          </div>
        )}
      </td>
    </tr>
  );
};

const StyleCounts = ({ dances }: { dances: ShowDance[] }) => {
  const counts: Record<string, number> = {};
  for (const d of dances) {
    if (d.dance_style !== 'PREDANCE' && d.dance_style !== 'All') {
      counts[d.dance_style] = (counts[d.dance_style] ?? 0) + 1;
    }
  }
  return (
    <span className="style-counts">
      {Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([style, count]) => (
          <span key={style} style={{ color: styleColors[style] }}>
            {count} {style}
          </span>
        ))}
    </span>
  );
};

const ChoreoCount = ({ dances }: { dances: ShowDance[] }) => {
  const counts: Record<string, number> = {};
  for (const d of dances) {
    if (d.dance_style !== 'PREDANCE') {
      counts[d.choreography] = (counts[d.choreography] ?? 0) + 1;
    }
  }
  return (
    <div className="metric-list">
      {Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([choreo, count]) => (
          <span key={choreo}>
            {count} {choreo}
          </span>
        ))}
    </div>
  );
};

const FamilyCount = ({ dances }: { dances: ShowDance[] }) => {
  const lastNames = new Set<string>();
  for (const d of dances) {
    for (const dancer of d.dancers) {
      const parts = dancer.split(' ');
      if (parts.length > 1) lastNames.add(parts[parts.length - 1]);
    }
  }
  return <span>{lastNames.size} families</span>;
};

export const ReportArea = ({ shows }: Props) => (
  <div className="report-area">
    <h2>Show Order Report</h2>
    {shows.map(show => {
      // Group the dances by their group name for style counts
      const groupDances: Record<string, ShowDance[]> = {};
      for (const d of show.dances) {
        if (['A', 'B', 'C'].includes(d.group)) {
          (groupDances[d.group] ??= []).push(d);
        }
      }

      return (
        <div key={show.recital_id} className="show-section">
          <div className="show-header">
            <h3>
              Show {show.recital_id}: {show.label}
            </h3>
            <div className="show-metrics">
              <FamilyCount dances={show.dances} />
              <ChoreoCount dances={show.dances} />
            </div>
          </div>

          {/* Group style counts */}
          <div className="group-style-counts">
            {Object.entries(groupDances).map(([g, dances]) => (
              <div key={g}>
                <strong>Group {g}:</strong> <StyleCounts dances={dances} />
              </div>
            ))}
          </div>

          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Group</th>
                <th>Dance</th>
                <th>Ct</th>
                <th>Dancer Overlap</th>
              </tr>
            </thead>
            <tbody>
              {show.dances.map((dance, idx) => (
                <DanceRow key={`${show.recital_id}-${idx}`} dance={dance} idx={idx} />
              ))}
            </tbody>
          </table>
        </div>
      );
    })}
  </div>
);
