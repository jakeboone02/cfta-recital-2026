import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useEffect, useState } from 'react';
import type { DanceMap, GroupName, GroupOrders } from './types';
import { styleSlug } from './utils';

interface Props {
  groups: GroupOrders;
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
  danceId: number | 'PRE';
  danceMap: DanceMap;
  flash?: boolean;
}) => {
  const dance = danceId !== 'PRE' ? danceMap[danceId] : null;
  const name = dance?.dance_name ?? 'PREDANCE';
  const dStyle = dance?.dance_style ?? 'PREDANCE';
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

const allGroups: GroupName[] = ['A', 'B', 'C'];

export const WorkingArea = ({ groups, danceMap, comboSiblingMap, onChange, actions }: Props) => {
  const [collapsed, setCollapsed] = useState<Record<GroupName, boolean>>({
    A: false,
    B: false,
    C: false,
  });
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  const toggleCollapse = (g: GroupName) => setCollapsed(prev => ({ ...prev, [g]: !prev[g] }));

  // Clear flash after timeout
  useEffect(() => {
    if (flashIds.size === 0) return;
    const timer = setTimeout(() => setFlashIds(new Set()), 1500);
    return () => clearTimeout(timer);
  }, [flashIds]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcGroup = source.droppableId as GroupName;
    const dstGroup = destination.droppableId as GroupName;
    const srcIdx = source.index;
    const dstIdx = destination.index;

    if (srcGroup === dstGroup && srcIdx === dstIdx) return;

    const movedDanceId = groups[srcGroup][srcIdx];

    // PREDANCE cannot move between groups
    if (srcGroup !== dstGroup && movedDanceId === 'PRE') return;

    const newGroups: GroupOrders = {
      A: [...groups.A],
      B: [...groups.B],
      C: [...groups.C],
    };

    if (srcGroup === dstGroup) {
      // Within-group reorder — no combo logic
      const arr = newGroups[srcGroup];
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(dstIdx, 0, moved);
    } else {
      // Cross-group move
      const srcArr = newGroups[srcGroup];
      const [moved] = srcArr.splice(srcIdx, 1);
      const dstArr = newGroups[dstGroup];
      dstArr.splice(dstIdx, 0, moved);

      // Check for combo sibling
      if (typeof movedDanceId === 'number') {
        const siblingId = comboSiblingMap[movedDanceId];
        if (siblingId != null) {
          // Find and remove sibling from its current group (which should be srcGroup)
          const sibIdx = srcArr.indexOf(siblingId);
          if (sibIdx !== -1) {
            srcArr.splice(sibIdx, 1);
            // Insert sibling directly after the moved dance in destination
            const movedIdx = dstArr.indexOf(movedDanceId);
            dstArr.splice(movedIdx + 1, 0, siblingId);
            setFlashIds(new Set([movedDanceId, siblingId]));
          }
        }
      }
    }

    onChange(newGroups);
  };

  const groupedDanceCount = groups.A.length + groups.B.length + groups.C.length;
  const groupDanceCountFloor = Math.floor(groupedDanceCount / 3);
  const groupDanceCountCeil = Math.ceil(groupedDanceCount / 3);

  return (
    <div className="working-area">
      <div className="panel-header">{actions}</div>
      <DragDropContext onDragEnd={handleDragEnd}>
        {allGroups.map(g => {
          const count = groups[g].length;
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
                    {groups[g].map((danceId, idx) => (
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
      </DragDropContext>
    </div>
  );
};
