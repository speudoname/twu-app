import { useState, useEffect, useRef } from 'react';
import { tasksAPI } from '../services/api';
import { Plus, Loader2, Trash2, Check, Circle, LayoutGrid, List, Tag, Calendar, AlertCircle, GitBranch } from 'lucide-react';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'matrix'
  const [sortBy, setSortBy] = useState('eisenhower'); // 'eisenhower', 'urgency', 'importance'
  const [draggedTask, setDraggedTask] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null); // { taskId, position: 'above' | 'below' }
  const inputRef = useRef(null);

  useEffect(() => {
    loadTasks();
    // Removed auto-focus to prevent keyboard popup on mobile

    // Cleanup: blur input when component unmounts to prevent focus restoration on mobile
    return () => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    };
  }, []);

  const loadTasks = async () => {
    try {
      setError('');
      const response = await tasksAPI.getAll();
      setTasks(response.data.tasks || []);
    } catch (error) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();

    if (!newTaskTitle.trim()) {
      return;
    }

    setAddingTask(true);
    setError('');

    try {
      const response = await tasksAPI.create({
        title: newTaskTitle,
        description: '',
        importance: 500000,
        urgency: 500000
      });

      if (response.data.success) {
        setTasks([response.data.task, ...tasks]);
        setNewTaskTitle('');

        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    } catch (error) {
      setError('Failed to add task');
    }

    setAddingTask(false);
  };

  const handleToggleTask = async (id) => {
    try {
      const response = await tasksAPI.toggle(id);

      if (response.data.success) {
        setTasks(
          tasks.map((task) =>
            task.id === id ? response.data.task : task
          )
        );
      }
    } catch (error) {
      setError('Failed to update task');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const response = await tasksAPI.delete(id);

      if (response.data.success) {
        setTasks(tasks.filter((task) => task.id !== id));
      }
    } catch (error) {
      setError('Failed to delete task');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
    // Delay state update to avoid re-render during drag start
    setTimeout(() => setDraggedTask(task), 0);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDropIndicator(null);
  };

  const handleDragOver = (e, task) => {
    if (!draggedTask || task.id === draggedTask.id) {
      return;
    }

    // Only use 'below' position to avoid double drop zones
    const position = 'below';

    // Only update dropIndicator if it actually changed (prevent constant re-renders)
    setDropIndicator(prev => {
      if (prev?.taskId === task.id && prev?.position === position) {
        return prev; // No change, don't re-render
      }
      return { taskId: task.id, position };
    });
  };

  const handleDrop = async (targetTask) => {
    if (!draggedTask || draggedTask.id === targetTask.id) {
      setDropIndicator(null);
      setDraggedTask(null);
      return;
    }

    const sortedTasks = incompleteTasks;
    const targetIndex = sortedTasks.findIndex(t => t.id === targetTask.id);

    if (targetIndex === -1) return;

    // With 'below' only logic: always drop below the target task
    const prevTask = targetTask;
    const nextTask = sortedTasks[targetIndex + 1];

    const MAX_VALUE = 1000000;
    const MIN_VALUE = 0;
    const REBALANCE_THRESHOLD = 1000;

    let newValues = {};
    let tasksToUpdate = [];

    if (sortBy === 'urgency') {
      const prevUrgency = prevTask?.urgency ?? MAX_VALUE;
      const nextUrgency = nextTask?.urgency ?? MIN_VALUE;
      const gap = prevUrgency - nextUrgency;

      if (gap < REBALANCE_THRESHOLD) {
        // REBALANCE: Redistribute all tasks evenly
        const tasksToRebalance = sortedTasks.slice();
        const step = MAX_VALUE / (tasksToRebalance.length + 1);

        tasksToUpdate = tasksToRebalance.map((t, idx) => ({
          id: t.id,
          urgency: Math.round(MAX_VALUE - (step * (idx + 1))),
          importance: t.importance
        }));
      } else {
        // Simple midpoint
        newValues.urgency = Math.round((prevUrgency + nextUrgency) / 2);
        newValues.importance = draggedTask.importance;
      }
    } else if (sortBy === 'importance') {
      const prevImportance = prevTask?.importance ?? MAX_VALUE;
      const nextImportance = nextTask?.importance ?? MIN_VALUE;
      const gap = prevImportance - nextImportance;

      if (gap < REBALANCE_THRESHOLD) {
        const tasksToRebalance = sortedTasks.slice();
        const step = MAX_VALUE / (tasksToRebalance.length + 1);

        tasksToUpdate = tasksToRebalance.map((t, idx) => ({
          id: t.id,
          importance: Math.round(MAX_VALUE - (step * (idx + 1))),
          urgency: t.urgency
        }));
      } else {
        newValues.importance = Math.round((prevImportance + nextImportance) / 2);
        newValues.urgency = draggedTask.urgency;
      }
    } else {
      // Eisenhower - calculate position between neighbors
      const prevImportance = prevTask?.importance ?? MAX_VALUE;
      const nextImportance = nextTask?.importance ?? MIN_VALUE;
      const prevUrgency = prevTask?.urgency ?? MAX_VALUE;
      const nextUrgency = nextTask?.urgency ?? MIN_VALUE;
      const gapImportance = prevImportance - nextImportance;
      const gapUrgency = prevUrgency - nextUrgency;

      if (gapImportance < REBALANCE_THRESHOLD || gapUrgency < REBALANCE_THRESHOLD) {
        const tasksToRebalance = sortedTasks.slice();
        const step = MAX_VALUE / (tasksToRebalance.length + 1);

        tasksToUpdate = tasksToRebalance.map((t, idx) => ({
          id: t.id,
          importance: Math.round(MAX_VALUE - (step * (idx + 1))),
          urgency: Math.round(MAX_VALUE - (step * (idx + 1)))
        }));
      } else {
        newValues.importance = Math.round((prevImportance + nextImportance) / 2);
        newValues.urgency = Math.round((prevUrgency + nextUrgency) / 2);
      }
    }

    try {
      if (tasksToUpdate.length > 0) {
        // Rebalancing mode: update multiple tasks
        const promises = tasksToUpdate.map(update =>
          tasksAPI.update(update.id, { importance: update.importance, urgency: update.urgency })
        );
        await Promise.all(promises);

        // Update state with all new values
        setTasks(tasks.map(t => {
          const update = tasksToUpdate.find(u => u.id === t.id);
          return update ? { ...t, importance: update.importance, urgency: update.urgency } : t;
        }));
      } else {
        // Single task update
        const response = await tasksAPI.update(draggedTask.id, newValues);
        if (response.data.success) {
          setTasks(tasks.map(t =>
            t.id === draggedTask.id ? { ...t, ...newValues } : t
          ));
        }
      }
    } catch (error) {
      setError('Failed to reorder task');
    }

    setDraggedTask(null);
    setDropIndicator(null);
  };

  // Eisenhower matrix logic (updated for 0-1,000,000 scale)
  const getEisenhowerQuadrant = (task) => {
    const importance = task.importance || 500000;
    const urgency = task.urgency || 500000;
    const isImportant = importance >= 500000;
    const isUrgent = urgency >= 500000;

    if (isImportant && isUrgent) return 1; // Do first
    if (isImportant && !isUrgent) return 2; // Schedule
    if (!isImportant && isUrgent) return 3; // Delegate
    return 4; // Eliminate
  };

  const sortTasks = (taskList) => {
    const incomplete = taskList.filter(t => t.completed !== 1);

    if (sortBy === 'eisenhower') {
      return incomplete.sort((a, b) => {
        const quadA = getEisenhowerQuadrant(a);
        const quadB = getEisenhowerQuadrant(b);
        if (quadA !== quadB) return quadA - quadB;
        // Within same quadrant, sort by urgency then importance
        if ((b.urgency || 500000) !== (a.urgency || 500000)) return (b.urgency || 500000) - (a.urgency || 500000);
        return (b.importance || 500000) - (a.importance || 500000);
      });
    } else if (sortBy === 'urgency') {
      return incomplete.sort((a, b) => (b.urgency || 500000) - (a.urgency || 500000));
    } else if (sortBy === 'importance') {
      return incomplete.sort((a, b) => (b.importance || 500000) - (a.importance || 500000));
    }
    return incomplete;
  };

  const getQuadrantTasks = (quadrant) => {
    return tasks.filter(t => t.completed !== 1 && getEisenhowerQuadrant(t) === quadrant);
  };

  const quadrantInfo = {
    1: { title: 'Do First', subtitle: 'Important & Urgent', color: '#ff3b30', bg: 'rgba(255, 59, 48, 0.1)' },
    2: { title: 'Schedule', subtitle: 'Important, Not Urgent', color: '#667eea', bg: 'rgba(102, 126, 234, 0.1)' },
    3: { title: 'Delegate', subtitle: 'Urgent, Not Important', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.1)' },
    4: { title: 'Eliminate', subtitle: 'Neither', color: '#8e8e93', bg: 'rgba(142, 142, 147, 0.1)' }
  };

  const completedTasks = tasks.filter(t => t.completed === 1);
  const incompleteTasks = sortTasks(tasks);

  const getPriorityColor = (value) => {
    // Updated for 0-1,000,000 scale
    if (value >= 700000) return '#ff3b30';
    if (value >= 500000) return '#ff9500';
    if (value >= 300000) return '#34c759';
    return '#8e8e93';
  };

  const TaskCard = ({ task, showQuadrant = false, allTasks = [] }) => {
    // Find parent task if this is a subtask
    const parentTask = task.parent_task_id
      ? allTasks.find(t => t.id === task.parent_task_id)
      : null;

    // Swipe gesture for delete
    const { swipeX, isSwiping, handlers } = useSwipeGesture({
      onSwipeRight: () => task.completed !== 1 && handleDeleteTask(task.id),
      threshold: 100
    });

    const isDragging = draggedTask?.id === task.id;
    const showBelowIndicator = dropIndicator?.taskId === task.id && dropIndicator.position === 'below';

    return (
    <div
      style={{
        position: 'relative',
        marginBottom: '12px',
        overflow: 'hidden',
        borderRadius: '20px'
      }}
    >
      {/* Delete button background (shown on swipe) */}
      {task.completed !== 1 && (
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            fontWeight: '600',
            fontSize: '15px',
            opacity: swipeX > 20 ? 1 : 0,
            transition: 'opacity 0.2s',
            background: 'linear-gradient(135deg, #ff3b30 0%, #ff6b6b 100%)',
            padding: '10px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)'
          }}>
            <Trash2 size={18} />
            Delete
          </div>
        </div>
      )}

      <div
        draggable={task.completed !== 1}
        onDragStart={(e) => {
          handleDragStart(e, task);
        }}
        onDragEnd={(e) => {
          handleDragEnd(e);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          handleDragOver(e, task);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Some browsers require getData() to be called
          e.dataTransfer.getData('text/plain');
          handleDrop(task);
        }}
        {...(task.completed !== 1 ? handlers : {})}
        style={{
          position: 'relative',
          background: task.completed === 1 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: task.completed === 1
            ? '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset'
            : '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
          border: '0.5px solid rgba(255, 255, 255, 0.8)',
          opacity: isDragging ? 0.4 : (task.completed === 1 ? 0.7 : 1),
          cursor: task.completed !== 1 ? 'move' : 'default',
          transform: task.completed !== 1 ? `translateX(${swipeX}px)` : 'none',
          transition: isSwiping || isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'pan-y'
        }}
      >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        pointerEvents: draggedTask ? 'none' : 'auto'
      }}>
        {/* Checkbox */}
        <button
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            handleToggleTask(task.id);
          }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: task.completed === 1 ? '2px solid #34c759' : '2px solid #667eea',
            background: task.completed === 1 ? '#34c759' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            marginTop: '2px'
          }}
        >
          {task.completed === 1 ? (
            <Check size={16} color="white" strokeWidth={3} />
          ) : (
            <Circle size={16} color="#667eea" strokeWidth={2.5} />
          )}
        </button>

        {/* Content */}
        <div style={{
          flex: 1,
          minWidth: 0,
          pointerEvents: 'none'
        }}>
          <div style={{
            fontSize: '15px',
            color: task.completed === 1 ? '#8e8e93' : '#1a1a1a',
            fontWeight: '500',
            lineHeight: '1.4',
            marginBottom: task.why || task.tags?.length || task.deadline ? '8px' : 0,
            textDecoration: task.completed === 1 ? 'line-through' : 'none'
          }}>
            {task.title}
          </div>

          {/* Why */}
          {task.why && (
            <div style={{
              fontSize: '13px',
              color: '#8e8e93',
              lineHeight: '1.4',
              marginBottom: '8px',
              fontStyle: 'italic'
            }}>
              {task.why}
            </div>
          )}

          {/* Badges Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            {/* Importance Badge */}
            {task.importance !== undefined && task.importance !== null && (
              <span style={{
                background: `${getPriorityColor(task.importance)}15`,
                color: getPriorityColor(task.importance),
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                <AlertCircle size={10} />
                I: {Math.round(task.importance / 100000)}
              </span>
            )}

            {/* Urgency Badge */}
            {task.urgency !== undefined && task.urgency !== null && (
              <span style={{
                background: `${getPriorityColor(task.urgency)}15`,
                color: getPriorityColor(task.urgency),
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                U: {Math.round(task.urgency / 100000)}
              </span>
            )}

            {/* Quadrant Badge (in matrix view) */}
            {showQuadrant && (
              <span style={{
                background: quadrantInfo[getEisenhowerQuadrant(task)].bg,
                color: quadrantInfo[getEisenhowerQuadrant(task)].color,
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.3px'
              }}>
                Q{getEisenhowerQuadrant(task)}
              </span>
            )}

            {/* Subtask Badge */}
            {parentTask && (
              <span style={{
                background: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                <GitBranch size={10} />
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {parentTask.title}
                </span>
              </span>
            )}

            {/* Deadline */}
            {task.deadline && (
              <span style={{
                background: 'rgba(255, 149, 0, 0.1)',
                color: '#ff9500',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <Calendar size={10} />
                {new Date(task.deadline).toLocaleDateString()}
              </span>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && task.tags.map((tag, idx) => (
              <span
                key={idx}
                style={{
                  background: `${tag.color}15`,
                  color: tag.color,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Tag size={9} />
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>

      {/* Drop indicator below */}
      {showBelowIndicator && (
        <div style={{
          position: 'absolute',
          bottom: '-6px',
          left: '0',
          right: '0',
          height: '4px',
          background: '#667eea',
          borderRadius: '2px',
          zIndex: 10,
          boxShadow: '0 0 8px rgba(102, 126, 234, 0.6)',
          pointerEvents: 'none'
        }} />
      )}
    </div>
    );
  };

  return (
    <div style={{
      minHeight: '100%',
      background: '#f5f7fa',
      padding: '16px'
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(255, 59, 48, 0.1)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '0.5px solid rgba(255, 59, 48, 0.2)',
            color: '#ff3b30',
            padding: '14px 16px',
            borderRadius: '16px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            {error}
          </div>
        )}

        {/* Add Task Card - Glass Morphism */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '24px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
          border: '0.5px solid rgba(255, 255, 255, 0.8)',
        }}>
          <form onSubmit={handleAddTask}>
            <input
              ref={inputRef}
              type="text"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={addingTask}
              style={{
                width: '100%',
                fontSize: '16px',
                padding: '0',
                border: 'none',
                background: 'transparent',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                outline: 'none',
                color: '#1a1a1a',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.caretColor = '#667eea'}
            />

            <button
              type="submit"
              disabled={addingTask || !newTaskTitle.trim()}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: '600',
                background: newTaskTitle.trim() && !addingTask
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(0, 0, 0, 0.05)',
                color: newTaskTitle.trim() && !addingTask ? 'white' : '#8e8e93',
                border: 'none',
                borderRadius: '14px',
                cursor: newTaskTitle.trim() && !addingTask ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: newTaskTitle.trim() && !addingTask
                  ? '0 4px 12px rgba(102, 126, 234, 0.4)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {addingTask ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
              {addingTask ? 'Adding...' : 'Add Task'}
            </button>
          </form>
        </div>

        {/* View Controls */}
        {tasks.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '20px',
            padding: '12px 16px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
            border: '0.5px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '12px', padding: '4px' }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: viewMode === 'list' ? 'white' : 'transparent',
                  color: viewMode === 'list' ? '#667eea' : '#8e8e93',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: viewMode === 'list' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <List size={14} />
                List
              </button>
              <button
                onClick={() => setViewMode('matrix')}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: viewMode === 'matrix' ? 'white' : 'transparent',
                  color: viewMode === 'matrix' ? '#667eea' : '#8e8e93',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: viewMode === 'matrix' ? '0 2px 4px rgba(0, 0, 0, 0.1)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                <LayoutGrid size={14} />
                Matrix
              </button>
            </div>

            {/* Sort Selector (only in list view) */}
            {viewMode === 'list' && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'white',
                  color: '#1a1a1a',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              >
                <option value="eisenhower">Eisenhower Matrix</option>
                <option value="urgency">By Urgency</option>
                <option value="importance">By Importance</option>
              </select>
            )}

            {/* Stats */}
            <div style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: '600' }}>
              <span style={{ color: '#667eea' }}>{incompleteTasks.length} To Do</span>
              <span style={{ color: '#34c759' }}>{completedTasks.length} Done</span>
            </div>
          </div>
        )}

        {/* Tasks Display */}
        <div>
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#8e8e93',
              fontSize: '15px'
            }}>
              <Loader2 size={24} className="spin" style={{ marginBottom: '12px' }} />
              <div>Loading tasks...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#8e8e93'
            }}>
              <p style={{ fontSize: '17px', marginBottom: '8px', fontWeight: '600', color: '#1a1a1a' }}>
                No tasks yet
              </p>
              <p style={{ fontSize: '14px' }}>
                Add your first task above to get started
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <>
                  {/* List View */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    style={{ minHeight: '200px' }}
                  >
                    {incompleteTasks.length > 0 && incompleteTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        showQuadrant={sortBy === 'eisenhower'}
                        allTasks={tasks}
                      />
                    ))}
                  </div>

                  {/* Completed Tasks */}
                  {completedTasks.length > 0 && (
                    <>
                      {incompleteTasks.length > 0 && (
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#8e8e93',
                          marginTop: '24px',
                          marginBottom: '12px',
                          marginLeft: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Completed
                        </div>
                      )}
                      {completedTasks.map((task) => (
                        <TaskCard key={task.id} task={task} allTasks={tasks} />
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Matrix View */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px'
                  }}>
                    {[1, 2, 3, 4].map(quadrant => (
                      <div
                        key={quadrant}
                        style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          backdropFilter: 'blur(40px) saturate(180%)',
                          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                          borderRadius: '20px',
                          padding: '16px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
                          border: '0.5px solid rgba(255, 255, 255, 0.8)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: `2px solid ${quadrantInfo[quadrant].color}` }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: quadrantInfo[quadrant].color }}>
                            {quadrantInfo[quadrant].title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8e8e93', marginTop: '2px' }}>
                            {quadrantInfo[quadrant].subtitle}
                          </div>
                          <div style={{ fontSize: '20px', fontWeight: '700', color: quadrantInfo[quadrant].color, marginTop: '6px' }}>
                            {getQuadrantTasks(quadrant).length}
                          </div>
                        </div>
                        <div>
                          {getQuadrantTasks(quadrant).map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              allTasks={tasks}
                            />
                          ))}
                          {getQuadrantTasks(quadrant).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#8e8e93', fontSize: '13px' }}>
                              No tasks in this quadrant
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Completed Tasks in Matrix View */}
                  {completedTasks.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#8e8e93',
                        marginBottom: '12px',
                        marginLeft: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Completed
                      </div>
                      {completedTasks.map((task) => (
                        <TaskCard key={task.id} task={task} allTasks={tasks} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
