import { anneal } from './optimizer/anneal';
import { buildScoringContext } from './optimizer/score';
import type { DanceData, AnnealConfig } from './optimizer/types';
import type { DanceRow, GroupOrders } from './types';

let scoringCtx: ReturnType<typeof buildScoringContext> | null = null;

self.onmessage = (e: MessageEvent) => {
  const { groups, config, dances, dancersByDance } = e.data as {
    groups: GroupOrders;
    config: AnnealConfig;
    dances?: DanceRow[];
    dancersByDance?: Record<number, string[]>;
  };

  // Initialize scoring context on first message (or when data is provided)
  if (dances && dancersByDance) {
    const optimizerDances: DanceData[] = dances.map(d => ({
      danceId: d.dance_id,
      danceName: d.dance_name,
      danceStyle: d.dance_style,
      choreography: d.choreography,
    }));
    const optimizerDancerMap = new Map(
      Object.entries(dancersByDance).map(([k, v]) => [Number(k), v])
    );
    scoringCtx = buildScoringContext(optimizerDances, optimizerDancerMap);
  }

  if (!scoringCtx) {
    self.postMessage({ type: 'error', message: 'No data provided to optimizer' });
    return;
  }

  try {
    const { topSolutions } = anneal(groups, scoringCtx, config, 1);
    if (topSolutions.length > 0) {
      const best = topSolutions[0].solution;
      self.postMessage({ type: 'result', groups: { A: best.A, B: best.B, C: best.C } });
    } else {
      self.postMessage({ type: 'error', message: 'No solutions found' });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
};
