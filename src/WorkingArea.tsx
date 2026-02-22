import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { DanceMap, GroupName, GroupOrders } from './types';
import { styleColors } from './utils';

interface Props {
  groups: GroupOrders;
  danceMap: DanceMap;
  onChange: (groups: GroupOrders) => void;
  actions?: React.ReactNode;
}

const DanceCard = ({ danceId, danceMap }: { danceId: number | 'PRE'; danceMap: DanceMap }) => {
  const dance = danceId !== 'PRE' ? danceMap[danceId] : null;
  const name = dance?.dance_name ?? 'PREDANCE';
  const dStyle = dance?.dance_style ?? 'PREDANCE';
  const color = styleColors[dStyle] ?? '#666';

  return (
    <>
      <div className="dance-card-color" style={{ backgroundColor: color }} />
      <div className="dance-card-content">
        <div className="dance-card-name" style={{ color }}>
          {name}
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

export const WorkingArea = ({ groups, danceMap, onChange, actions }: Props) => {
  const [collapsed, setCollapsed] = useState<Record<GroupName, boolean>>({
    A: false,
    B: false,
    C: false,
  });
  const toggleCollapse = (g: GroupName) => setCollapsed(prev => ({ ...prev, [g]: !prev[g] }));

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcGroup = source.droppableId as GroupName;
    const dstGroup = destination.droppableId as GroupName;
    const srcIdx = source.index;
    const dstIdx = destination.index;

    if (srcGroup === dstGroup && srcIdx === dstIdx) return;

    // PREDANCE cannot move between groups
    if (srcGroup !== dstGroup && groups[srcGroup][srcIdx] === 'PRE') return;

    const newGroups = { ...groups };

    if (srcGroup === dstGroup) {
      const arr = [...newGroups[srcGroup]];
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(dstIdx, 0, moved);
      newGroups[srcGroup] = arr;
    } else {
      const srcArr = [...newGroups[srcGroup]];
      const dstArr = [...newGroups[dstGroup]];
      const [moved] = srcArr.splice(srcIdx, 1);
      dstArr.splice(dstIdx, 0, moved);
      newGroups[srcGroup] = srcArr;
      newGroups[dstGroup] = dstArr;
    }

    onChange(newGroups);
  };

  const allCollapsed = allGroups.every(g => collapsed[g]);
  const collapseExpandAll = () => {
    const val = !allCollapsed;
    setCollapsed({ A: val, B: val, C: val });
  };

  return (
    <div className="working-area">
      <div className="panel-header">
        <h2>Group Orders</h2>
        <div className="header-actions">
          <button className="btn-collapse-all" onClick={collapseExpandAll} title={allCollapsed ? 'Expand all' : 'Collapse all'}>
            <span style={{ display: 'inline-block', transform: allCollapsed ? undefined : 'rotate(90deg)' }}>»</span>
          </button>
          {actions}
        </div>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        {allGroups.map(g => {
          const count = groups[g].length;
          const warn = count < 10 || count > 11;
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
                    className={`group-drop-zone ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                    style={{ display: isCollapsed ? 'none' : undefined }}>
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
                            <DanceCard danceId={danceId} danceMap={danceMap} />
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
