import { anneal } from './optimizer/anneal';
import { buildScoringContext } from './optimizer/score';
import type { AnnealConfig, DanceData, ShowPart } from './optimizer/types';
import type { ComboPair, DanceRow, GroupOrders } from './types';

let scoringCtx: ReturnType<typeof buildScoringContext> | null = null;

self.onmessage = (e: MessageEvent) => {
  const {
    groups,
    config,
    dances,
    dancersByDance,
    groupNames,
    allGroupNames,
    showParts,
    comboPairs,
    fixedOrderGroups,
  } = e.data as {
    groups: GroupOrders;
    config: AnnealConfig;
    dances?: DanceRow[];
    dancersByDance?: Record<number, string[]>;
    groupNames?: string[];
    allGroupNames?: string[];
    showParts?: ShowPart[];
    comboPairs?: ComboPair[];
    fixedOrderGroups?: string[];
  };

  // Initialize scoring context on first message (or when data is provided)
  if (dances && dancersByDance && showParts) {
    const optimizerDances: DanceData[] = dances.map(d => ({
      danceId: d.dance_id,
      danceName: d.dance_name,
      danceStyle: d.dance_style,
      choreography: d.choreography,
      skipOverlapChecks: d.skip_overlap_checks,
      excludeTeachers: d.exclude_teachers,
    }));
    const optimizerDancerMap = new Map(
      Object.entries(dancersByDance).map(([k, v]) => [Number(k), v])
    );
    const allGNames = allGroupNames ?? groupNames ?? [];
    const pairs: [number, number][] = (comboPairs ?? []).map(p => [p.dance_id_1, p.dance_id_2]);
    const fixedSet = new Set(fixedOrderGroups ?? []);
    scoringCtx = buildScoringContext(
      optimizerDances,
      optimizerDancerMap,
      allGNames,
      showParts,
      pairs,
      fixedSet
    );
  }

  if (!scoringCtx) {
    self.postMessage({ type: 'error', message: 'No data provided to optimizer' });
    return;
  }

  try {
    const { topSolutions } = anneal(groups, scoringCtx, config, 1);
    if (topSolutions.length > 0) {
      self.postMessage({ type: 'result', groups: topSolutions[0].solution });
    } else {
      self.postMessage({ type: 'error', message: 'No solutions found' });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err) });
  }
};
