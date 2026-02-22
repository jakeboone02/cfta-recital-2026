import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DanceMap, GroupName, GroupOrders } from './types';
import { styleColors } from './utils';

interface Props {
  groups: GroupOrders;
  danceMap: DanceMap;
  onChange: (groups: GroupOrders) => void;
}

// Unique key for each item: "GROUP-INDEX" to handle PRE duplicates
const itemKey = (group: GroupName, idx: number) => `${group}-${idx}`;

const parseKey = (key: string): { group: GroupName; idx: number } => {
  const [group, idx] = key.split('-');
  return { group: group as GroupName, idx: parseInt(idx) };
};

interface SortableItemProps {
  id: string;
  danceId: number | 'PRE';
  danceMap: DanceMap;
  isOverlay?: boolean;
}

const SortableItem = ({ id, danceId, danceMap, isOverlay }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const dance = danceId !== 'PRE' ? danceMap[danceId] : null;
  const name = dance?.dance_name ?? 'PREDANCE';
  const dStyle = dance?.dance_style ?? 'PREDANCE';
  const color = styleColors[dStyle] ?? '#666';

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? {} : style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      className={`dance-card ${isOverlay ? 'dragging' : ''}`}>
      <div className="dance-card-color" style={{ backgroundColor: color }} />
      <div className="dance-card-content">
        <div className="dance-card-name" style={{ color }}>{name}</div>
        {dance && (
          <div className="dance-card-details">
            <span>{dance.choreography}</span>
            <span className="dance-card-song">{dance.song}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const OverlayItem = ({ danceId, danceMap }: { danceId: number | 'PRE'; danceMap: DanceMap }) => {
  const dance = danceId !== 'PRE' ? danceMap[danceId] : null;
  const name = dance?.dance_name ?? 'PREDANCE';
  const dStyle = dance?.dance_style ?? 'PREDANCE';
  const color = styleColors[dStyle] ?? '#666';

  return (
    <div className="dance-card dragging">
      <div className="dance-card-color" style={{ backgroundColor: color }} />
      <div className="dance-card-content">
        <div className="dance-card-name" style={{ color }}>{name}</div>
        {dance && (
          <div className="dance-card-details">
            <span>{dance.choreography}</span>
            <span className="dance-card-song">{dance.song}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const WorkingArea = ({ groups, danceMap, onChange }: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<GroupName, boolean>>({ A: false, B: false, C: false });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleCollapse = (g: GroupName) => setCollapsed(prev => ({ ...prev, [g]: !prev[g] }));

  // Build flat list of all items with group info
  const allGroups: GroupName[] = ['A', 'B', 'C'];
  const allItems = allGroups.flatMap(g => groups[g].map((danceId, idx) => ({ key: itemKey(g, idx), group: g, danceId })));
  const allKeys = allItems.map(i => i.key);

  const findItem = (key: string) => {
    const item = allItems.find(i => i.key === key);
    if (!item) return undefined;
    const { idx } = parseKey(key);
    return { ...item, idx };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = findItem(active.id as string);
    const overItem = findItem(over.id as string);
    if (!activeItem || !overItem) return;

    // If crossing groups, move the item
    if (activeItem.group !== overItem.group) {
      // PREDANCE cannot move between groups
      if (activeItem.danceId === 'PRE') return;

      const newGroups = { ...groups };
      const sourceArr = [...newGroups[activeItem.group]];
      const destArr = [...newGroups[overItem.group]];

      const sourceIdx = activeItem.idx;
      const [moved] = sourceArr.splice(sourceIdx, 1);
      const destIdx = overItem.idx;
      destArr.splice(destIdx, 0, moved);

      newGroups[activeItem.group] = sourceArr;
      newGroups[overItem.group] = destArr;
      onChange(newGroups);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = findItem(active.id as string);
    const overItem = findItem(over.id as string);
    if (!activeItem || !overItem) return;

    // Same group: reorder
    if (activeItem.group === overItem.group) {
      const g = activeItem.group;
      const arr = [...groups[g]];
      const newArr = arrayMove(arr, activeItem.idx, overItem.idx);
      onChange({ ...groups, [g]: newArr });
    }
  };

  const activeDanceId = activeId ? findItem(activeId)?.danceId : null;

  return (
    <div className="working-area">
      <h2>Dance Order</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}>
        <SortableContext items={allKeys} strategy={verticalListSortingStrategy}>
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
                {!isCollapsed &&
                  groups[g].map((danceId, idx) => (
                    <SortableItem
                      key={itemKey(g, idx)}
                      id={itemKey(g, idx)}
                      danceId={danceId}
                      danceMap={danceMap}
                    />
                  ))}
              </div>
            );
          })}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeDanceId != null ? <OverlayItem danceId={activeDanceId} danceMap={danceMap} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
