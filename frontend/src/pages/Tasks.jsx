import { useState, useEffect, useRef } from 'react';
import { tasksAPI } from '../services/api';
import { Plus, Loader2, Trash2, Check, Circle } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    loadTasks();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const loadTasks = async () => {
    try {
      setError('');
      const response = await tasksAPI.getAll();
      setTasks(response.data.tasks || []);
    } catch (error) {
      setError('Failed to load tasks');
      console.error('Load tasks error:', error);
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
      console.error('Add task error:', error);
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
      console.error('Toggle task error:', error);
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
      console.error('Delete task error:', error);
    }
  };

  const completedTasks = tasks.filter(t => t.completed === 1);
  const incompleteTasks = tasks.filter(t => t.completed !== 1);

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

        {/* Stats Card */}
        {tasks.length > 0 && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '20px',
            padding: '16px 20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
            border: '0.5px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#667eea' }}>
                  {incompleteTasks.length}
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '500' }}>
                  To Do
                </div>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#34c759' }}>
                  {completedTasks.length}
                </div>
                <div style={{ fontSize: '12px', color: '#8e8e93', fontWeight: '500' }}>
                  Done
                </div>
              </div>
            </div>
            {tasks.length > 0 && (
              <div style={{
                fontSize: '13px',
                color: '#8e8e93',
                fontWeight: '500'
              }}>
                {Math.round((completedTasks.length / tasks.length) * 100)}% Complete
              </div>
            )}
          </div>
        )}

        {/* Tasks List */}
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
              {/* Incomplete Tasks */}
              {incompleteTasks.length > 0 && (
                <>
                  {incompleteTasks.map((task) => (
                    <div
                      key={task.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        borderRadius: '20px',
                        padding: '18px',
                        marginBottom: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
                        border: '0.5px solid rgba(255, 255, 255, 0.8)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px'
                      }}
                    >
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
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <Circle size={16} color="#667eea" strokeWidth={2.5} />
                      </button>

                      {/* Task Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '15px',
                          color: '#1a1a1a',
                          fontWeight: '400',
                          lineHeight: '1.4'
                        }}>
                          {task.title}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={{
                          padding: '8px',
                          background: 'rgba(255, 59, 48, 0.1)',
                          color: '#ff3b30',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </>
              )}

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
                    <div
                      key={task.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        borderRadius: '20px',
                        padding: '18px',
                        marginBottom: '12px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
                        border: '0.5px solid rgba(255, 255, 255, 0.6)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        opacity: 0.7
                      }}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: '2px solid #34c759',
                          background: '#34c759',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <Check size={16} color="white" strokeWidth={3} />
                      </button>

                      {/* Task Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '15px',
                          color: '#8e8e93',
                          fontWeight: '400',
                          lineHeight: '1.4',
                          textDecoration: 'line-through'
                        }}>
                          {task.title}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        style={{
                          padding: '8px',
                          background: 'rgba(255, 59, 48, 0.1)',
                          color: '#ff3b30',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
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
