import { useState } from 'react';
import type { ShowData, ShowDance } from './utils';
import { styleSlug } from './utils';

interface Props {
  shows: ShowData[];
  groupNames: string[];
  actions?: React.ReactNode;
  dancerLastNames: Record<string, string>;
  compact?: boolean;
  label?: string;
}

const OverlapCell = ({ dance, compact }: { dance: ShowDance; compact?: boolean }) => {
  const isSpec = dance.group === 'SpecTAPular';
  const nextNames = dance.common_with_next;
  const next2Names = dance.common_with_next2;
  if (!nextNames.length && !next2Names.length) return null;

  if (compact) {
    return (
      <>
        {nextNames.length > 0 && (
          <div className={isSpec ? 'overlap-muted' : 'overlap-next'}>
            <strong>Next:</strong> <span title={nextNames.join(', ')}>{nextNames.length}</span>
          </div>
        )}
        {next2Names.length > 0 && (
          <div className={isSpec ? 'overlap-muted-light' : 'overlap-next2'}>
            <strong>+2:</strong> <span title={next2Names.join(', ')}>{next2Names.length}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {nextNames.length > 0 && (
        <div className={isSpec ? 'overlap-muted' : 'overlap-next'}>
          <strong>Next:</strong> {nextNames.join(', ')}
        </div>
      )}
      {next2Names.length > 0 && (
        <div className={isSpec ? 'overlap-muted-light' : 'overlap-next2'}>
          <strong>+2:</strong> {next2Names.join(', ')}
        </div>
      )}
    </>
  );
};

const DanceRow = ({
  dance,
  idx,
  compact,
  groupNames,
}: {
  dance: ShowDance;
  idx: number;
  compact?: boolean;
  groupNames: string[];
}) => {
  const color = styleSlug(dance.dance_style);
  const isSpec = dance.group === 'SpecTAPular';
  return (
    <tr className="report-dance-row">
      {/* <td className="report-order">{idx + 1}</td> */}
      <td>
        {groupNames.includes(dance.group) ? (
          <span className="report-group-badge">{dance.group}</span>
        ) : (
          ' '
        )}
      </td>
      <td>
        <div className="report-dance-title">
          <span className={`style-${color} bold`}>{dance.dance_name}</span>
          <span className="report-choreo">{dance.choreography}</span>
        </div>
        <div className="report-song">
          {dance.song} — {dance.artist}
        </div>
      </td>
      <td className="report-count">{dance.dancers.length || ''}</td>
      <td className="report-overlap">
        <OverlapCell dance={dance} compact={compact} />
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
          <span key={style} className={`style-${styleSlug(style)}`}>
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
            <strong>{count}</strong> {choreo}
          </span>
        ))}
    </div>
  );
};

const FamilyCount = ({
  dances,
  dancerLastNames,
}: {
  dances: ShowDance[];
  dancerLastNames: Record<string, string>;
}) => {
  const lastNames = new Set<string>();
  for (const d of dances) {
    for (const dancer of d.dancers) {
      const ln = dancerLastNames[dancer];
      if (ln) lastNames.add(ln);
    }
  }
  return (
    <span>
      <strong>{lastNames.size}</strong> families
    </span>
  );
};

const OverlapCount = ({ dances }: { dances: ShowDance[] }) => {
  const nonSpec = dances.filter(d => d.group !== 'SpecTAPular');
  const nextOverlap = nonSpec.reduce((n, d) => n + d.common_with_next.length, 0);
  const next2Overlap = nonSpec.reduce((n, d) => n + d.common_with_next2.length, 0);

  return (
    (nextOverlap > 0 || next2Overlap > 0) && (
      <div>
        <strong>Dancer overlap issues</strong>:{' '}
        <span className="overlap-next">
          Next dance <strong>{nextOverlap}</strong>
        </span>
        {', '}
        <span className="overlap-next2">
          Dance after next <strong>{next2Overlap}</strong>
        </span>
      </div>
    )
  );
};

export const ReportArea = ({
  shows,
  groupNames,
  actions,
  dancerLastNames,
  compact,
  label,
}: Props) => {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const toggle = (id: number) => setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const allCollapsed = shows.every(s => collapsed[s.show_id]);
  const collapseExpandAll = () => {
    const val = !allCollapsed;
    setCollapsed(Object.fromEntries(shows.map(s => [s.show_id, val])));
  };

  return (
    <div className="report-area">
      <div className="panel-header">
        <h2>{label ? `Show Order — ${label}` : 'Show Order'}</h2>
        <div className="header-actions">
          <button
            className="btn-collapse-all"
            onClick={collapseExpandAll}
            title={allCollapsed ? 'Expand all' : 'Collapse all'}>
            <span className={`collapse-icon ${allCollapsed ? 'collapsed' : ''}`}>»</span>
          </button>
          {actions}
        </div>
      </div>
      {shows.map(show => {
        // Group the dances by their group name for style counts
        const groupDances: Record<string, ShowDance[]> = {};
        for (const d of show.dances) {
          if (groupNames.includes(d.group)) {
            (groupDances[d.group] ??= []).push(d);
          }
        }
        const isCollapsed = collapsed[show.show_id] ?? false;

        return (
          <div key={show.show_id} className="show-section">
            <div className="show-header" onClick={() => toggle(show.show_id)}>
              <h3>
                <span className={`collapse-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                Show {show.show_id}: {show.label}
              </h3>
              <div className="show-metrics">
                <FamilyCount dances={show.dances} dancerLastNames={dancerLastNames} />
                <ChoreoCount dances={show.dances} />
                <OverlapCount dances={show.dances} />
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

            {!isCollapsed && (
              <table className="report-table">
                <thead>
                  <tr>
                    {/* <th>#</th> */}
                    <th>G</th>
                    <th>Dance</th>
                    <th>#</th>
                    <th>Dancer Overlap</th>
                  </tr>
                </thead>
                <tbody>
                  {show.dances.map((dance, idx) => (
                    <DanceRow
                      key={`${show.show_id}-${idx}`}
                      dance={dance}
                      idx={idx}
                      compact={compact}
                      groupNames={groupNames}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
};
