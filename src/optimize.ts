import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { anneal } from './optimizer/anneal';
import { buildScoringContext, scoreSolution } from './optimizer/score';
import type { AnnealConfig, DanceData, ShowPart, Solution } from './optimizer/types';

// ── Load data from database ──────────────────────────────────────────────

const db = new Database(`${import.meta.dir}/../build/database.db`, { readonly: true });

const loadDances = (): DanceData[] =>
  db
    .query<
      { dance_id: number; dance_name: string; dance_style: string; choreography: string },
      SQLQueryBindings[]
    >('SELECT dance_id, dance_name, dance_style, choreography FROM dances')
    .all()
    .map(r => ({
      danceId: r.dance_id,
      danceName: r.dance_name,
      danceStyle: r.dance_style,
      choreography: r.choreography,
    }));

const loadDancersByDance = (): Map<number, string[]> => {
  const rows = db
    .query<{ dance_id: number; dancer_name: string }, SQLQueryBindings[]>(
      `SELECT DISTINCT d.dance_id, dc.dancer_name
         FROM dances d
         INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
         INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
        WHERE NOT (d.dance_name = 'SpecTAPular' AND dc.dancer_name IN (
          SELECT dancer_name FROM dancers WHERE is_teacher = 1
        ))`
    )
    .all();

  const map = new Map<number, string[]>();
  for (const r of rows) {
    if (!map.has(r.dance_id)) map.set(r.dance_id, []);
    map.get(r.dance_id)!.push(r.dancer_name);
  }
  return map;
};

const loadCurrentGroups = (): Solution => {
  const rows = db
    .query<{ recital_group: string; show_order: string }, SQLQueryBindings[]>(
      'SELECT recital_group, show_order FROM recital_groups'
    )
    .all();

  const solution: Solution = {};
  for (const r of rows) {
    solution[r.recital_group] = JSON.parse(r.show_order);
  }
  return solution;
};

const loadShowParts = (): { groupNames: string[]; showParts: ShowPart[] } => {
  const rows = db
    .query<{ recital_id: number; group_order: string }, SQLQueryBindings[]>(
      'SELECT recital_id, group_order FROM recitals ORDER BY recital_id'
    )
    .all();

  const showParts: ShowPart[] = rows.map(r => ({
    recitalId: r.recital_id,
    groups: JSON.parse(r.group_order),
  }));

  const groupNames = [...new Set(showParts.flatMap(s => s.groups))].sort();
  return { groupNames, showParts };
};

// ── Main ─────────────────────────────────────────────────────────────────

const dances = loadDances();
const dancersByDance = loadDancersByDance();
const currentSolution = loadCurrentGroups();
const { groupNames, showParts } = loadShowParts();
const ctx = buildScoringContext(dances, dancersByDance, groupNames, showParts);

db.close();

// Score the current solution
const currentResult = scoreSolution(currentSolution, ctx);

console.log('════════════════════════════════════════════════════════════════');
console.log('  CFTA Recital 2026 — Show Order Optimizer');
console.log('════════════════════════════════════════════════════════════════\n');

console.log('Current solution score:', currentResult.total);
console.log('Breakdown:', currentResult.breakdown);
console.log();

// Print current show details
for (const detail of currentResult.details) {
  if (detail.consecutivePairs.length > 0) {
    console.log(`Show ${detail.recitalId} — consecutive conflicts:`);
    for (const p of detail.consecutivePairs) {
      console.log(`  ${p.dance1} → ${p.dance2}: ${p.dancers.join(', ')}`);
    }
  }
}
console.log();

// Run optimizer
const config: AnnealConfig = {
  initialTemp: 5000,
  coolingRate: 0.9997,
  iterations: 200_000,
  restarts: 3,
};

console.log(
  `Running simulated annealing (${config.iterations.toLocaleString()} iterations × ${config.restarts + 1} runs)...`
);
const startTime = performance.now();
const TOP_N = 10;
const { topSolutions } = anneal(currentSolution, ctx, config, TOP_N);
const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
console.log(`Done in ${elapsed}s — found ${topSolutions.length} unique solutions\n`);

const danceMap = new Map(dances.map(d => [d.danceId, d]));

const printSolution = (sol: Solution, result: ReturnType<typeof scoreSolution>) => {
  // Print CSV (same format as recital_groups.csv)
  console.log('recital_group,show_order');
  for (const g of groupNames) {
    const order = JSON.stringify(sol[g]).replace(/"/g, '""');
    console.log(`${g},"${order}"`);
  }
  console.log(
    `  Breakdown: consec=${result.breakdown.consecutiveDancers}, near=${result.breakdown.nearConsecutiveDancers}, style=${result.breakdown.sameStyleAdjacent}, babyAdj=${result.breakdown.babyAdjacent}, babyEnd=${result.breakdown.babyAtGroupEnd}, families=${result.breakdown.familyImbalance}, preTooClose=${result.breakdown.preTooClose}, styleImbal=${result.breakdown.styleImbalance}`
  );

  // Show conflicts if any
  for (const detail of result.details) {
    if (detail.consecutivePairs.length > 0) {
      const showLabel =
        detail.recitalId === 1 ? 'Fri' : detail.recitalId === 2 ? 'Sat AM' : 'Sat PM';
      for (const p of detail.consecutivePairs) {
        console.log(`  ⚠ ${showLabel}: ${p.dance1} → ${p.dance2}: ${p.dancers.join(', ')}`);
      }
    }
  }
};

// Print all top solutions
for (let rank = 0; rank < topSolutions.length; rank++) {
  const { solution: sol, score } = topSolutions[rank];
  const result = scoreSolution(sol, ctx);
  const pctImprove =
    currentResult.total > 0 ? ((1 - score / currentResult.total) * 100).toFixed(0) : '0';

  console.log('════════════════════════════════════════════════════════════════');
  console.log(
    `  #${rank + 1}  Score: ${score}  (was ${currentResult.total}, ${pctImprove}% improvement)`
  );
  console.log('════════════════════════════════════════════════════════════════');
  printSolution(sol, result);
  console.log();
}

// Detailed view of the #1 solution
const best = topSolutions[0].solution;
const bestResult = scoreSolution(best, ctx);

console.log('════════════════════════════════════════════════════════════════');
console.log('  #1 DETAILED VIEW');
console.log('════════════════════════════════════════════════════════════════\n');

for (const g of groupNames) {
  console.log(`── Group ${g} (${best[g].length} dances) ──`);
  best[g].forEach((id, idx) => {
    if (id === 'PRE') {
      console.log(`  ${(idx + 1).toString().padStart(2)}. [PREDANCE placeholder]`);
    } else {
      const d = danceMap.get(id);
      console.log(
        `  ${(idx + 1).toString().padStart(2)}. ${d?.danceName ?? `Dance ${id}`} (${d?.danceStyle}, ${d?.choreography})`
      );
    }
  });
  console.log();
}

for (const detail of bestResult.details) {
  console.log(`── Show ${detail.recitalId} ──`);
  if (detail.consecutivePairs.length > 0) {
    console.log('  ⚠ Consecutive dancer conflicts:');
    for (const p of detail.consecutivePairs) {
      console.log(`    ${p.dance1} → ${p.dance2}: ${p.dancers.join(', ')}`);
    }
  } else {
    console.log('  ✓ No consecutive dancer conflicts');
  }
  if (detail.nearConsecutivePairs.length > 0) {
    console.log(
      `  ⚠ Near-consecutive conflicts (gap=1): ${detail.nearConsecutivePairs.length} pairs`
    );
    for (const p of detail.nearConsecutivePairs) {
      console.log(`    ${p.dance1} → [gap] → ${p.dance3}: ${p.dancers.join(', ')}`);
    }
  } else {
    console.log('  ✓ No near-consecutive dancer conflicts');
  }
  if (detail.sameStylePairs.length > 0) {
    console.log('  ⚠ Same-style adjacent:');
    for (const p of detail.sameStylePairs) {
      console.log(`    ${p.dance1} → ${p.dance2} (${p.style})`);
    }
  } else {
    console.log('  ✓ No same-style adjacent');
  }
  console.log();
}

// Output CSV for #1 (copy-paste into Import)
console.log('════════════════════════════════════════════════════════════════');
console.log('  CSV — PASTE INTO IMPORT (#1)');
console.log('════════════════════════════════════════════════════════════════\n');
console.log('recital_group,show_order');
for (const g of groupNames) {
  const order = JSON.stringify(best[g]).replace(/"/g, '""');
  console.log(`${g},"${order}"`);
}
console.log();
