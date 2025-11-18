import { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { Loader2, Check, Circle, CalendarCheck, Timer } from 'lucide-react';

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTodayTasks();
  }, []);

  const loadTodayTasks = async () => {
    try {
      setError('');
      const response = await tasksAPI.getAll();

      // Filter for today's tasks: tasks with deadline today or high importance/urgency
      const allTasks = response.data.tasks || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTasks = allTasks.filter(task => {
        if (task.completed === 1) return false;

        // Include if deadline is today
        if (task.deadline) {
          const deadline = new Date(task.deadline);
          deadline.setHours(0, 0, 0, 0);
          if (deadline.getTime() === today.getTime()) return true;
        }

        // Include if high importance AND high urgency (Q1)
        const importance = task.importance || 500000;
        const urgency = task.urgency || 500000;
        if (importance >= 500000 && urgency >= 500000) return true;

        return false;
      });

      setTasks(todayTasks);
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
        // Remove from list if completed
        setTasks(tasks.filter(task => task.id !== id));
      }
    } catch (error) {
      setError('Failed to update task');
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
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
              <div>Loading today's tasks...</div>
            </div>
          ) : tasks.length === 0 ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: '24px',
              padding: '60px 20px',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
              border: '0.5px solid rgba(255, 255, 255, 0.8)'
            }}>
              <Check size={48} color="#34c759" strokeWidth={2} style={{ marginBottom: '16px' }} />
              <p style={{
                fontSize: '20px',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                All clear for today!
              </p>
              <p style={{
                fontSize: '14px',
                color: '#8e8e93',
                margin: 0
              }}>
                No urgent tasks scheduled
              </p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: '20px',
              padding: '12px 16px',
              marginBottom: '12px',
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
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} for today
              </div>

              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '16px',
                    borderRadius: '16px',
                    marginBottom: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    border: '0.5px solid rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleTask(task.id)}
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
                        marginBottom: task.deadline ? '8px' : 0
                      }}>
                        {task.title}
                      </div>

                      {/* Deadline badge */}
                      {task.deadline && (
                        <span style={{
                          background: 'rgba(255, 149, 0, 0.1)',
                          color: '#ff9500',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <CalendarCheck size={10} />
                          Due today
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
