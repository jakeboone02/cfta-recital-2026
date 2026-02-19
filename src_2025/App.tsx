import { Fragment, useEffect, useReducer, useState } from 'react';
import type { RecitalDanceInstance } from './types';

type MoveDance = (id: number | null, direction: 'up' | 'down' | number | null) => Promise<void>;

interface DanceRowProps {
  dance: RecitalDanceInstance;
  moveDance: MoveDance;
  prev_prev_dance?: RecitalDanceInstance;
  prev_dance?: RecitalDanceInstance;
  next_dance?: RecitalDanceInstance;
  next_next_dance?: RecitalDanceInstance;
  second_next_dance?: RecitalDanceInstance;
  highlight?: boolean;
}

const colSpan = 6;

const toCsv = (jsonArray: RecitalDanceInstance[]) => {
  if (jsonArray.length === 0) return '';
  const headers = Object.keys(jsonArray[0]) as (keyof RecitalDanceInstance)[];
  const csvRows = [`overall_order,${headers.sort(a => (a === 'dancers' ? 1 : -1)).join(',')}`];

  return csvRows
    .concat(
      jsonArray.map((row, idx) =>
        [`${idx + 1}`]
          .concat(
            headers.map(header => {
              if (header === 'dancers') return `"${row[header].join(', ')}"`;
              const baseString = `${row[header] ?? ''}`;
              return baseString.includes(',')
                ? `"${baseString.replaceAll('"', '""')}"`
                : baseString;
            })
          )
          .join(',')
      )
    )
    .join('\n');
};

const styleColors = {
  Acro: 'firebrick',
  Ballet: 'lightskyblue',
  'Lyrical/Modern': 'hotpink',
  Jazz: 'orange',
  'Musical Theater': 'rebeccapurple',
  Tap: 'green',
  'BABY DANCE': 'gray',
};

export const DanceRow = ({
  dance,
  moveDance,
  prev_prev_dance,
  prev_dance,
  next_dance,
  next_next_dance,
  second_next_dance,
  highlight,
}: DanceRowProps) => {
  const md_up = () =>
    moveDance(dance.id, dance.recital_group === 'B' ? prev_prev_dance?.id ?? null : 'up');
  const md_down = () =>
    moveDance(dance.id, dance.recital_group === 'B' ? next_dance?.id ?? null : 'down');
  const disableUp =
    dance.follows_dance_id === null ||
    (dance.recital_group === 'B' &&
      prev_dance?.follows_dance_id === null &&
      prev_dance?.part === 1);
  const disableDown =
    (dance.recital_group !== 'B' && next_dance?.part !== dance.part) ||
    (dance.recital_group === 'B' && next_next_dance?.recital !== dance.recital);

  return (
    <tr
      style={{
        backgroundColor: highlight ? 'color(srgb 0.4 0.2 0.6 / 0.26)' : undefined,
        transition: 'background-color 0.8s ease-in-out',
      }}>
      <td style={{ textWrap: 'nowrap' }}>
        {(dance.id ?? 'X') === 'X' ? (
          ''
        ) : (
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button title={`Move dance ${dance.id} up`} onClick={md_up} disabled={disableUp}>
              ˄
            </button>
            <button title={`Move dance ${dance.id} down`} onClick={md_down} disabled={disableDown}>
              ˅
            </button>
          </div>
        )}
      </td>
      <td title={`ID: ${dance.id}, Follows: ${dance.follows_dance_id}`}>
        {
          /* {dance.recital_group === 'B' ? (<div className="gray">Baby Dance</div>) : ( */
          <div className="dance">
            <div className="dance-and-song" style={{ color: styleColors[dance.dance_style] }}>
              <div>{dance.dance}</div>
              <div className="song-and-artist">
                <span className="song">{dance.song}</span>
                {dance.artist}
              </div>
            </div>
            <div style={{ fontSize: 'small', color: 'gray' }}>
              {dance.choreography.replace('Ms. ', '')}
            </div>
          </div>
        }
      </td>
      <td style={{ fontSize: 'small', textAlign: 'right' }}>{dance.dancer_count}</td>
      <td style={{ fontSize: 'small' }} className="red">
        {next_dance?.dancers.filter(d => dance.dancers.includes(d))?.join(', ').length ? (
          <strong>In {next_dance?.dance}: </strong>
        ) : (
          ''
        )}
        {next_dance?.dancers.filter(d => dance.dancers.includes(d)).join(', ')}
      </td>
      <td style={{ fontSize: 'small' }} className="orange">
        {next_next_dance?.dancers.filter(d => dance.dancers.includes(d))?.join(', ').length ? (
          <strong>In {next_next_dance?.dance}: </strong>
        ) : (
          ''
        )}
        {next_next_dance?.dancers.filter(d => dance.dancers.includes(d)).join(', ')}
      </td>
      <td style={{ fontSize: 'small' }} className="gray">
        {second_next_dance?.dancers.filter(d => dance.dancers.includes(d))?.join(', ').length ? (
          <strong>In {second_next_dance?.dance}: </strong>
        ) : (
          ''
        )}
        {second_next_dance?.dancers.filter(d => dance.dancers.includes(d)).join(', ')}
      </td>
    </tr>
  );
};

interface UpdateHighlightedIDsAction {
  type: 'add' | 'remove';
  id: number;
}

const highlightedIDsReducer = (state: number[], action: UpdateHighlightedIDsAction): number[] => {
  switch (action.type) {
    case 'add':
      return state.includes(action.id) ? state : [...state, action.id];
    case 'remove':
      return state.filter(id => id !== action.id);
    default:
      return state;
  }
};

export const App = () => {
  const [data, setData] = useState<RecitalDanceInstance[]>([]);
  const [highlightedIDs, highlightedIDsDispatch] = useReducer(highlightedIDsReducer, []);

  const fetchData = async () => {
    const response = await fetch('/api/data');
    const data = (await response.json()) as RecitalDanceInstance[];
    setData(data);
  };

  const moveDance: MoveDance = async (id, direction) => {
    if (id === null) return;
    const response = await fetch('/api/sort', {
      method: 'POST',
      body: JSON.stringify([id, direction]),
    });
    const data = (await response.json()) as RecitalDanceInstance[];
    console.log(data);
    fetchData();
    highlightedIDsDispatch({ type: 'add', id });
    setTimeout(() => highlightedIDsDispatch({ type: 'remove', id }), 500);
  };

  const csv = toCsv(data);

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="App">
      <h3>
        Copper Hills Center for the Arts 2025 Dance Recital Show Order
        <span style={{ float: 'right' }}>
          <button onClick={() => fetchData()}>⟳</button>
        </span>
      </h3>
      <a
        download="recital-order-2025.csv"
        href={`data:text/plain;charset=utf-8,${encodeURIComponent(csv)}`}>
        Download Recital Order
      </a>
      <table>
        <tbody>
          {data.map((dance, idx) => {
            const prev_prev_dance =
              data[idx - 2]?.recital === dance.recital ? data[idx - 2] : undefined;
            const prev_dance = data[idx - 1]?.recital === dance.recital ? data[idx - 1] : undefined;
            const next_dance = data[idx + 1]?.recital === dance.recital ? data[idx + 1] : undefined;
            const next_next_dance =
              data[idx + 2]?.recital === dance.recital ? data[idx + 2] : undefined;
            const second_next_dance =
              data[idx + 3]?.recital === dance.recital ? data[idx + 3] : undefined;
            return (
              <Fragment key={`${dance.recital}-${dance.id}`}>
                {dance.recital !== data[idx - 1]?.recital && (
                  <>
                    {data[idx - 1] && (
                      <tr>
                        <th
                          colSpan={colSpan}
                          style={{ borderLeft: '2px solid white', borderRight: '2px solid white' }}>
                          {'\xA0'}
                        </th>
                      </tr>
                    )}
                    <tr>
                      <th colSpan={colSpan}>
                        {dance.recital_description} (Recital {dance.recital})
                      </th>
                    </tr>
                    <tr>
                      <th>Move</th>
                      <th>Dance</th>
                      <th>Dancers</th>
                      <th>In Next Dance</th>
                      <th>In Dance After Next</th>
                      <th>In Second Dance After Next</th>
                    </tr>
                  </>
                )}
                {dance.part !== data[idx - 1]?.part && (
                  <tr>
                    <td>{'\xA0'}</td>
                    <td colSpan={colSpan - 1} style={{ fontStyle: 'italic', fontWeight: 'bold' }}>
                      Part {dance.part} (Group {next_dance?.recital_group})
                    </td>
                  </tr>
                )}
                <DanceRow
                  dance={dance}
                  moveDance={moveDance}
                  prev_prev_dance={prev_prev_dance}
                  prev_dance={prev_dance}
                  next_dance={next_dance}
                  next_next_dance={next_next_dance}
                  second_next_dance={second_next_dance}
                  highlight={highlightedIDs.includes(dance.id!)}
                />
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <pre style={{ display: 'none' }}>
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );
};
