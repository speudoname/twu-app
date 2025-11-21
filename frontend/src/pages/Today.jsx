import { useState, useEffect, useRef } from 'react';
import { tasksAPI } from '../services/api';
import { Loader2, Check, Circle, CalendarCheck, Timer, Trash2, X, Clock } from 'lucide-react';
import PomodoroTimer from '../components/PomodoroTimer';

export default function Today() {
  const [todayTasks, setTodayTasks] = useState([]);
  const [leftoverTasks, setLeftoverTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipedTaskId, setSwipedTaskId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [pomodoroTask, setPomodoroTask] = useState(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  useEffect(() => {
    loadTodayTasks();
  }, []);

  const loadTodayTasks = async () => {
    try {
      setError('');
      const response = await tasksAPI.getAll();
      const allTasks = response.data.tasks || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

      // Today section: tasks with planned_for_today = today AND not completed
      const todayFiltered = allTasks.filter(task =>
        task.completed !== 1 &&
        task.planned_for_today === todayStr
      );

      // Leftovers section: tasks with planned_for_today < today AND not completed
      const leftoversFiltered = allTasks.filter(task => {
        if (task.completed === 1 || !task.planned_for_today) return false;
        const plannedDate = new Date(task.planned_for_today + 'T00:00:00');
        return plannedDate.getTime() < today.getTime();
      });

      setTodayTasks(todayFiltered);
      setLeftoverTasks(leftoversFiltered);
    } catch (error) {
      setError('Failed to load today\'s tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (id) => {
    try {
      const response = await tasksAPI.toggle(id);
      if (response.data.success) {
        // Remove from both sections if completed
        setTodayTasks(todayTasks.filter(task => task.id !== id));
        setLeftoverTasks(leftoverTasks.filter(task => task.id !== id));
      }
    } catch (error) {
      setError('Failed to update task');
    }
  };

  const handleRemoveFromToday = async (id) => {
    try {
      await tasksAPI.planToday(id); // Toggle to remove from today
      await loadTodayTasks(); // Reload to update both sections
    } catch (error) {
      setError('Failed to remove from today');
    }
  };

  const handleMoveToToday = async (id) => {
    try {
      await tasksAPI.planToday(id); // This will set planned_for_today to today
      await loadTodayTasks(); // Reload to update both sections
    } catch (error) {
      setError('Failed to move to today');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await tasksAPI.delete(id);
      setTodayTasks(todayTasks.filter(task => task.id !== id));
      setLeftoverTasks(leftoverTasks.filter(task => task.id !== id));
    } catch (error) {
      setError('Failed to delete task');
    }
  };

  const handlePomodoroComplete = async (newCount) => {
    if (pomodoroTask) {
      try {
        await tasksAPI.updatePomodoro(pomodoroTask.id, newCount);
        await loadTodayTasks();
      } catch (error) {
        console.error('Failed to update pomodoro count:', error);
      }
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e, taskId) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setSwipedTaskId(taskId);
    setIsSwiping(false);
  };

  const handleTouchMove = (e, taskId) => {
    if (swipedTaskId !== taskId) return;

    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;

    if (Math.abs(diff) > 10) {
      setIsSwiping(true);
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = (task, section) => {
    const diff = currentXRef.current - startXRef.current;

    if (Math.abs(diff) > 100) {
      if (diff > 0) {
        // Swipe right - Timer
        setPomodoroTask(task);
      } else {
        // Swipe left - depends on section
        if (section === 'today') {
          handleRemoveFromToday(task.id);
        } else if (section === 'leftover') {
          // For leftovers, swipe left moves to Today
          handleMoveToToday(task.id);
        }
      }
    }

    setIsSwiping(false);
    setSwipedTaskId(null);
    setSwipeOffset(0);
    startXRef.current = 0;
    currentXRef.current = 0;
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderTaskCard = (task, section) => {
    const isBeingSwiped = swipedTaskId === task.id && isSwiping;
    const currentOffset = isBeingSwiped ? swipeOffset : 0;
    const isHovered = hoveredTaskId === task.id;

    return (
      <div
        key={task.id}
        onMouseEnter={() => setHoveredTaskId(task.id)}
        onMouseLeave={() => setHoveredTaskId(null)}
        style={{
          position: 'relative',
          marginBottom: '8px',
          overflow: 'hidden',
          borderRadius: '16px'
        }}
      >
        {/* Swipe background indicators */}
        {isBeingSwiped && (
          <>
            {/* Right swipe - Timer (Blue) */}
            {currentOffset > 0 && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(currentOffset, 100)}px`,
                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '16px',
                borderRadius: '16px'
              }}>
                <Timer size={24} color="white" />
              </div>
            )}

            {/* Left swipe - varies by section */}
            {currentOffset < 0 && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(Math.abs(currentOffset), 100)}px`,
                background: section === 'today'
                  ? 'linear-gradient(90deg, #ff3b30 0%, #ff6b6b 100%)'
                  : 'linear-gradient(90deg, #34c759 0%, #5dd39e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '16px',
                borderRadius: '16px'
              }}>
                {section === 'today' ? (
                  <X size={24} color="white" />
                ) : (
                  <CalendarCheck size={24} color="white" />
                )}
              </div>
            )}
          </>
        )}

        {/* Task card */}
        <div
          onTouchStart={(e) => handleTouchStart(e, task.id)}
          onTouchMove={(e) => handleTouchMove(e, task.id)}
          onTouchEnd={() => handleTouchEnd(task, section)}
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            border: '0.5px solid rgba(0, 0, 0, 0.05)',
            transform: `translateX(${currentOffset}px)`,
            transition: isBeingSwiped ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            {/* Checkbox */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleTask(task.id);
              }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: '2px solid #667eea',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                marginTop: '2px'
              }}
            >
              <Circle size={16} color="#667eea" strokeWidth={2.5} />
            </button>

            {/* Content */}
            <div style={{
              flex: 1,
              minWidth: 0
            }}>
              <div style={{
                fontSize: '15px',
                color: '#1a1a1a',
                fontWeight: '500',
                lineHeight: '1.4',
                marginBottom: task.pomodoro_count ? '8px' : 0
              }}>
                {task.title}
              </div>

              {/* Pomodoro count badge */}
              {task.pomodoro_count > 0 && (
                <span style={{
                  background: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Timer size={10} />
                  {task.pomodoro_count}
                </span>
              )}
            </div>
          </div>

          {/* Desktop hover buttons */}
          {isHovered && !isSwiping && (
            <div style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              gap: '8px',
              zIndex: 10
            }}>
              {/* Timer button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPomodoroTask(task);
                }}
                style={{
                  background: '#667eea',
                  border: 'none',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.1)';
                  e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >
                <Timer size={18} color="white" strokeWidth={2.5} />
              </button>

              {/* Section-specific action button */}
              {section === 'today' ? (
                // Remove from Today button (Red X)
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFromToday(task.id);
                  }}
                  style={{
                    background: '#ff3b30',
                    border: 'none',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 6px 16px rgba(255, 59, 48, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 4px 12px rgba(255, 59, 48, 0.3)';
                  }}
                >
                  <X size={18} color="white" strokeWidth={2.5} />
                </button>
              ) : (
                // Move to Today button (Green Calendar)
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToToday(task.id);
                  }}
                  style={{
                    background: '#34c759',
                    border: 'none',
                    borderRadius: '12px',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 6px 16px rgba(52, 199, 89, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 4px 12px rgba(52, 199, 89, 0.3)';
                  }}
                >
                  <CalendarCheck size={18} color="white" strokeWidth={2.5} />
                </button>
              )}

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task.id);
                }}
                style={{
                  background: '#8e8e93',
                  border: 'none',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(142, 142, 147, 0.3)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.1)';
                  e.target.style.boxShadow = '0 6px 16px rgba(142, 142, 147, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = '0 4px 12px rgba(142, 142, 147, 0.3)';
                }}
              >
                <Trash2 size={18} color="white" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
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

        {/* Header */}
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            <CalendarCheck size={32} color="#667eea" strokeWidth={2.5} />
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1a1a1a',
              margin: 0
            }}>
              Today
            </h1>
          </div>
          <p style={{
            fontSize: '15px',
            color: '#8e8e93',
            margin: 0
          }}>
            {getTodayDate()}
          </p>
        </div>

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

        {/* Loading State */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#8e8e93',
            fontSize: '15px'
          }}>
            <Loader2 size={24} className="spin" style={{ marginBottom: '12px' }} />
            <div>Loading today's tasks...</div>
          </div>
        ) : (
          <>
            {/* Today Section */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                borderRadius: '20px',
                padding: '12px 16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
                border: '0.5px solid rgba(255, 255, 255, 0.8)'
              }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#667eea',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Timer size={14} />
                  {todayTasks.length === 0 ? 'No tasks planned for today' : `${todayTasks.length} ${todayTasks.length === 1 ? 'task' : 'tasks'} for today`}
                </div>

                {todayTasks.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#8e8e93',
                    fontSize: '14px'
                  }}>
                    <Check size={32} color="#34c759" strokeWidth={2} style={{ marginBottom: '12px' }} />
                    <p style={{ margin: 0 }}>Plan tasks from the Tasks page</p>
                  </div>
                ) : (
                  todayTasks.map((task) => renderTaskCard(task, 'today'))
                )}
              </div>
            </div>

            {/* Leftovers Section */}
            {leftoverTasks.length > 0 && (
              <div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  borderRadius: '20px',
                  padding: '12px 16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
                  border: '0.5px solid rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#ff9500',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Clock size={14} />
                    {leftoverTasks.length} leftover {leftoverTasks.length === 1 ? 'task' : 'tasks'} from previous days
                  </div>

                  {leftoverTasks.map((task) => renderTaskCard(task, 'leftover'))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pomodoro Timer Modal */}
      {pomodoroTask && (
        <PomodoroTimer
          isOpen={!!pomodoroTask}
          onClose={() => setPomodoroTask(null)}
          onPomodoroComplete={handlePomodoroComplete}
          taskTitle={pomodoroTask.title}
        />
      )}

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
