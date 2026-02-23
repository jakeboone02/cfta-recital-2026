import { DANCES, DANCERS_BY_DANCE } from './data.generated';
import type { DanceData, AnnealConfig } from './optimizer/types';
import { buildScoringContext } from './optimizer/score';
import { anneal } from './optimizer/anneal';
import type { GroupOrders } from './types';

const optimizerDances: DanceData[] = DANCES.map(d => ({
  danceId: d.dance_id,
  danceName: d.dance_name,
  danceStyle: d.dance_style,
  choreography: d.choreography,
}));
const optimizerDancerMap = new Map(
  Object.entries(DANCERS_BY_DANCE).map(([k, v]) => [Number(k), v])
);
const scoringCtx = buildScoringContext(optimizerDances, optimizerDancerMap);

self.onmessage = (e: MessageEvent) => {
  const { groups, config } = e.data as { groups: GroupOrders; config: AnnealConfig };
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
