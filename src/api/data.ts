import type { Env } from '../env';

export async function handleData(
  request: Request,
  env: Env,
  instanceId: number
): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });

  const [dances, groups, comboPairs, dancerRows, dancerMetaRows, showRows] = await Promise.all([
    env.DB.prepare(
      'SELECT dance_id, dance_style, dance_name, choreography, song, artist, skip_overlap_checks, exclude_teachers FROM dances WHERE recital_instance_id = ?'
    )
      .bind(instanceId)
      .all(),
    env.DB.prepare(
      'SELECT recital_group, show_order, has_fixed_order FROM recital_groups WHERE recital_instance_id = ?'
    )
      .bind(instanceId)
      .all(),
    env.DB.prepare(
      `SELECT a.dance_id AS dance_id_1, b.dance_id AS dance_id_2
         FROM class_dances a
         JOIN class_dances b ON a.class_id = b.class_id AND a.dance_id < b.dance_id
        WHERE a.recital_instance_id = ?`
    )
      .bind(instanceId)
      .all(),
    env.DB.prepare(
      `SELECT DISTINCT d.dance_id, dc.dancer_name
         FROM dances d
         INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
         INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
         INNER JOIN dancers dn ON dc.dancer_name = dn.dancer_name AND dn.recital_instance_id = d.recital_instance_id
        WHERE d.recital_instance_id = ?
        ORDER BY d.dance_id, UPPER(dn.last_name), UPPER(dn.first_name)`
    )
      .bind(instanceId)
      .all(),
    env.DB.prepare(
      `SELECT dancer_name,
              last_name,
              COALESCE(NULLIF(TRIM(family_label), ''), last_name) AS family_name
         FROM dancers
        WHERE recital_instance_id = ?`
    )
      .bind(instanceId)
      .all(),
    env.DB.prepare(
      'SELECT csv_show_id AS show_id, group_order, show_description, show_time FROM shows WHERE recital_instance_id = ? ORDER BY csv_show_id'
    )
      .bind(instanceId)
      .all(),
  ]);

  // Build dancers-by-dance lookup (excluding teachers from dances with exclude_teachers)
  const excludeTeacherDanceIds = new Set(
    (dances.results as any[]).filter(d => d.exclude_teachers === 1).map(d => d.dance_id)
  );
  // We need teacher names for filtering — fetch them
  const teacherRows = await env.DB.prepare(
    'SELECT dancer_name FROM dancers WHERE recital_instance_id = ? AND is_teacher = 1'
  )
    .bind(instanceId)
    .all();
  const teacherNameSet = new Set((teacherRows.results as any[]).map(r => r.dancer_name));

  const dancersByDance: Record<number, string[]> = {};
  for (const r of dancerRows.results as any[]) {
    // Exclude teachers from dances flagged with exclude_teachers
    if (excludeTeacherDanceIds.has(r.dance_id) && teacherNameSet.has(r.dancer_name)) continue;
    (dancersByDance[r.dance_id] ??= []).push(r.dancer_name);
  }

  // Build dancer last-name lookup
  const dancerLastNameMap: Record<string, string> = {};
  const dancerFamilyMap: Record<string, string> = {};
  for (const r of dancerMetaRows.results as any[]) {
    dancerLastNameMap[r.dancer_name] = r.last_name;
    dancerFamilyMap[r.dancer_name] = r.family_name;
  }

  // Parse group show_order JSON
  const parsedGroups = groups.results.map((g: any) => ({
    recital_group: g.recital_group,
    show_order: JSON.parse(g.show_order),
    has_fixed_order: g.has_fixed_order,
  }));

  // Parse shows group_order JSON
  const parsedShows = showRows.results.map((r: any) => ({
    show_id: r.show_id,
    group_order: JSON.parse(r.group_order),
    show_description: r.show_description,
    show_time: r.show_time,
  }));

  const instance = await env.DB.prepare(
    'SELECT config, placeholder_dances FROM recital_instances WHERE id = ?'
  )
    .bind(instanceId)
    .first();

  // Filter combo pairs: exclude dances in fixed-order groups
  const fixedGroupDanceIds = new Set<number>();
  for (const g of parsedGroups) {
    if (g.has_fixed_order) {
      for (const id of g.show_order) {
        if (typeof id === 'number') fixedGroupDanceIds.add(id);
      }
    }
  }
  const filteredComboPairs = (comboPairs.results as any[]).filter(
    (r: any) => !fixedGroupDanceIds.has(r.dance_id_1) && !fixedGroupDanceIds.has(r.dance_id_2)
  );

  return Response.json({
    dances: dances.results,
    groups: parsedGroups,
    shows: parsedShows,
    comboPairs: filteredComboPairs,
    dancersByDance,
    dancerFamilies: dancerFamilyMap,
    dancerLastNames: dancerLastNameMap,
    config: instance?.config ? JSON.parse(instance.config as string) : null,
    placeholderDances: instance?.placeholder_dances
      ? JSON.parse(instance.placeholder_dances as string)
      : null,
  });
}
