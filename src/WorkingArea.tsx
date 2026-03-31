import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useEffect, useState } from 'react';
import type { DanceMap, GroupOrders } from './types';
import { styleSlug } from './utils';

interface Props {
  groups: GroupOrders;
  groupNames: string[];
  danceMap: DanceMap;
  comboSiblingMap: Record<number, number>;
  onChange: (groups: GroupOrders) => void;
  actions?: React.ReactNode;
}

const DanceCard = ({
  danceId,
  danceMap,
  flash,
}: {
  danceId: number | 'PLACEHOLDER';
  danceMap: DanceMap;
  flash?: boolean;
}) => {
  const dance = danceId !== 'PLACEHOLDER' ? danceMap[danceId] : null;
  const name = dance?.dance_name ?? 'PLACEHOLDER';
  const dStyle = dance?.dance_style ?? 'PLACEHOLDER';
  const slug = styleSlug(dStyle);

  return (
    <>
      <div className={`dance-card-color style-bg-${slug}`} />
      <div className="dance-card-content">
        <div className={`dance-card-name style-${slug}`}>
          {name}
          {flash && <span className="combo-moved-badge">↳ combo</span>}
        </div>
        {dance && (
          <div className="dance-card-details">
            <span>{dance.choreography}</span>
            <span className="dance-card-song">{dance.song}</span>
          </div>
        )}
      </div>
    </>
  );
};

export const WorkingArea = ({
  groups,
  groupNames,
  danceMap,
  comboSiblingMap,
  onChange,
  actions,
}: Props) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const toggleCollapse = (g: string) => setCollapsed(prev => ({ ...prev, [g]: !prev[g] }));

  // Clear flash after timeout
  useEffect(() => {
    if (flashIds.size === 0) return;
    const timer = setTimeout(() => setFlashIds(new Set()), 1500);
    return () => clearTimeout(timer);
  }, [flashIds]);

  // Compute unassigned dances
  const assignedIds = new Set<number>();
  for (const g of groupNames) {
    for (const id of groups[g] ?? []) {
      if (typeof id === 'number') assignedIds.add(id);
    }
  }
  const unassignedDances = Object.values(danceMap).filter(d => !assignedIds.has(d.dance_id));

  const UNASSIGNED = '__unassigned__';

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcGroup = source.droppableId;
    const dstGroup = destination.droppableId;
    const srcIdx = source.index;
    const dstIdx = destination.index;

    if (srcGroup === dstGroup && srcIdx === dstIdx) return;

    // Build mutable copy
    const newGroups: GroupOrders = Object.fromEntries(
      groupNames.map(g => [g, [...(groups[g] ?? [])]])
    );

    if (srcGroup === UNASSIGNED) {
      // Dragging from unassigned pool into a group
      const danceId = unassignedDances[srcIdx]?.dance_id;
      if (danceId == null || dstGroup === UNASSIGNED) return;
      newGroups[dstGroup].splice(dstIdx, 0, danceId);
    } else if (dstGroup === UNASSIGNED) {
      // Dragging from a group to unassigned (remove from group)
      const movedDanceId = newGroups[srcGroup][srcIdx];
      if (movedDanceId === 'PLACEHOLDER') return;
      newGroups[srcGroup].splice(srcIdx, 1);
    } else if (srcGroup === dstGroup) {
      // Within-group reorder
      const arr = newGroups[srcGroup];
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(dstIdx, 0, moved);
    } else {
      // Cross-group move
      const movedDanceId = newGroups[srcGroup][srcIdx];
      if (movedDanceId === 'PLACEHOLDER') return;
      const srcArr = newGroups[srcGroup];
      const [moved] = srcArr.splice(srcIdx, 1);
      const dstArr = newGroups[dstGroup];
      dstArr.splice(dstIdx, 0, moved);

      // Check for combo sibling
      if (typeof movedDanceId === 'number') {
        const siblingId = comboSiblingMap[movedDanceId];
        if (siblingId != null) {
          const sibIdx = srcArr.indexOf(siblingId);
          if (sibIdx !== -1) {
            srcArr.splice(sibIdx, 1);
            const movedIdx = dstArr.indexOf(movedDanceId);
            dstArr.splice(movedIdx + 1, 0, siblingId);
            setFlashIds(new Set([movedDanceId, siblingId]));
          }
        }
      }
    }

    onChange(newGroups);
  };

  const groupedDanceCount = groupNames.reduce((n, g) => n + (groups[g]?.length ?? 0), 0);
  const groupDanceCountFloor = Math.floor(groupedDanceCount / groupNames.length);
  const groupDanceCountCeil = Math.ceil(groupedDanceCount / groupNames.length);

  return (
    <div className="working-area">
      <div className="panel-header">{actions}</div>
      <DragDropContext onDragEnd={handleDragEnd}>
        {groupNames.map(g => {
          const count = (groups[g] ?? []).length;
          const warn = count < groupDanceCountFloor || count > groupDanceCountCeil;
          const isCollapsed = collapsed[g];
          return (
            <div key={g} className="group-section">
              <div
                className={`group-header ${warn ? 'group-warn' : ''}`}
                onClick={() => toggleCollapse(g)}>
                <span>
                  <span className={`collapse-icon ${isCollapsed ? 'collapsed' : ''}`}>▼</span>
                  Group {g}
                </span>
                <span className="group-count">
                  {count} dances{warn ? ' ⚠' : ''}
                </span>
              </div>
              <Droppable droppableId={g}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`group-drop-zone ${snapshot.isDraggingOver ? 'drag-over' : ''} ${isCollapsed ? 'hidden' : ''}`}>
                    {(groups[g] ?? []).map((danceId, idx) => (
                      <Draggable
                        key={`${g}-${idx}`}
                        draggableId={`${g}-${idx}-${danceId}`}
                        index={idx}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`dance-card ${snapshot.isDragging ? 'dragging' : ''}`}>
                            <DanceCard
                              danceId={danceId}
                              danceMap={danceMap}
                              flash={typeof danceId === 'number' && flashIds.has(danceId)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
        {unassignedDances.length > 0 && (
          <div className="group-section group-section--unassigned">
            <div className="group-header" onClick={() => toggleCollapse(UNASSIGNED)}>
              <span>
                <span className={`collapse-icon ${collapsed[UNASSIGNED] ? 'collapsed' : ''}`}>
                  ▼
                </span>
                Unassigned
              </span>
              <span className="group-count">{unassignedDances.length} dances</span>
            </div>
            <Droppable droppableId={UNASSIGNED}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`group-drop-zone ${snapshot.isDraggingOver ? 'drag-over' : ''} ${collapsed[UNASSIGNED] ? 'hidden' : ''}`}>
                  {unassignedDances.map((dance, idx) => (
                    <Draggable
                      key={`unassigned-${dance.dance_id}`}
                      draggableId={`unassigned-${dance.dance_id}`}
                      index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`dance-card ${snapshot.isDragging ? 'dragging' : ''}`}>
                          <DanceCard danceId={dance.dance_id} danceMap={danceMap} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}
      </DragDropContext>
    </div>
  );
};
