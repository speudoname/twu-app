import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Tag, Calendar, ChevronDown, Check } from 'lucide-react';
import { tasksAPI, tagsAPI } from '../services/api';

export default function TaskConversionModal({ isOpen, onClose, inboxItem, onConvert }) {
  const [tasks, setTasks] = useState([{
    title: inboxItem?.content || '',
    why: '',
    importance: 5,
    urgency: 5,
    deadline: '',
    parent_task_id: null,
    tags: []
  }]);
  const [availableTags, setAvailableTags] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [tagInput, setTagInput] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadTags();
      loadTasks();
    }
  }, [isOpen]);

  const loadTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      setAvailableTags(response.data.tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadTasks = async () => {
    setLoadingTasks(true);
    try {
      const response = await tasksAPI.getAll();
      setAvailableTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  const addTask = () => {
    setTasks([...tasks, {
      title: '',
      why: '',
      importance: 5,
      urgency: 5,
      deadline: '',
      parent_task_id: null,
      tags: []
    }]);
  };

  const removeTask = (index) => {
    if (tasks.length === 1) return;
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const addTagToTask = (index, tag) => {
    const newTasks = [...tasks];
    if (!newTasks[index].tags.some(t => t.name === tag.name)) {
      newTasks[index].tags.push(tag);
    }
    setTasks(newTasks);
    setTagInput({ ...tagInput, [index]: '' });
  };

  const removeTagFromTask = (taskIndex, tagIndex) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].tags.splice(tagIndex, 1);
    setTasks(newTasks);
  };

  const createNewTag = async (index, tagName) => {
    try {
      const response = await tagsAPI.create({ name: tagName, color: '#667eea' });
      const newTag = response.data.tag;
      setAvailableTags([...availableTags, newTag]);
      addTagToTask(index, newTag);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleTagInputKeyDown = (index, e) => {
    if (e.key === 'Enter' && tagInput[index]?.trim()) {
      const existingTag = availableTags.find(t => t.name.toLowerCase() === tagInput[index].toLowerCase());
      if (existingTag) {
        addTagToTask(index, existingTag);
      } else {
        createNewTag(index, tagInput[index].trim());
      }
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (tasks.some(t => !t.title.trim())) {
      alert('All tasks must have a title');
      return;
    }

    setLoading(true);
    try {
      await onConvert(tasks);
      onClose();
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Failed to convert inbox item to tasks');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 2000,
          animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '95%',
        maxWidth: '600px',
        height: '90%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: '0.5px solid rgba(255, 255, 255, 0.8)',
        zIndex: 2001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '0.5px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1a1a1a',
            margin: 0
          }}>
            Convert to Tasks
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              borderRadius: '12px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} color="#1a1a1a" />
          </button>
        </div>

        {/* Tasks List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {tasks.map((task, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '12px',
                border: '0.5px solid rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Task Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#667eea'
                }}>
                  Task {index + 1}
                </span>
                {tasks.length > 1 && (
                  <button
                    onClick={() => removeTask(index)}
                    style={{
                      background: 'rgba(255, 59, 48, 0.1)',
                      color: '#ff3b30',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Title */}
              <input
                type="text"
                placeholder="What to do?"
                value={task.title}
                onChange={(e) => updateTask(index, 'title', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '15px',
                  border: '0.5px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: '500'
                }}
              />

              {/* Why */}
              <textarea
                placeholder="Why is this important?"
                value={task.why}
                onChange={(e) => updateTask(index, 'why', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '0.5px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '12px',
                  marginBottom: '12px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  minHeight: '60px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />

              {/* Importance Slider */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Importance: {task.importance}
                </label>
                <input
                  type="range"
                  min="0"
                  max="9"
                  value={task.importance}
                  onChange={(e) => updateTask(index, 'importance', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#667eea'
                  }}
                />
              </div>

              {/* Urgency Slider */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Urgency: {task.urgency}
                </label>
                <input
                  type="range"
                  min="0"
                  max="9"
                  value={task.urgency}
                  onChange={(e) => updateTask(index, 'urgency', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#ff9500'
                  }}
                />
              </div>

              {/* Deadline */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Calendar size={14} />
                  Deadline (optional)
                </label>
                <input
                  type="datetime-local"
                  value={task.deadline}
                  onChange={(e) => updateTask(index, 'deadline', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '0.5px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}
                />
              </div>

              {/* Parent Task */}
              <div
                ref={openDropdown === index ? dropdownRef : null}
                style={{ marginBottom: '12px', position: 'relative' }}
              >
                <label style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '6px',
                  display: 'block'
                }}>
                  Add as subtask of (optional)
                </label>
                <div
                  onClick={() => setOpenDropdown(openDropdown === index ? null : index)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '0.5px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span style={{
                    color: task.parent_task_id ? '#1a1a1a' : '#999',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {loadingTasks ? 'Loading tasks...' : (
                      task.parent_task_id
                        ? availableTasks.find(t => t.id === task.parent_task_id)?.title || 'None (top-level task)'
                        : 'None (top-level task)'
                    )}
                  </span>
                  <ChevronDown
                    size={16}
                    style={{
                      transition: 'transform 0.2s ease',
                      transform: openDropdown === index ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                  />
                </div>

                {/* Dropdown Menu */}
                {openDropdown === index && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: 'rgba(255, 255, 255, 0.98)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    border: '0.5px solid rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    animation: 'dropdownSlide 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    WebkitOverflowScrolling: 'touch'
                  }}>
                    {loadingTasks ? (
                      <div style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: '#999',
                        fontSize: '13px'
                      }}>
                        Loading tasks...
                      </div>
                    ) : availableTasks.length === 0 ? (
                      <div style={{
                        padding: '12px',
                        textAlign: 'center',
                        color: '#999',
                        fontSize: '13px'
                      }}>
                        No tasks available. Create your first task!
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTask(index, 'parent_task_id', null);
                            setOpenDropdown(null);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.15s ease',
                            background: !task.parent_task_id ? 'rgba(102, 126, 234, 0.08)' : 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = !task.parent_task_id ? 'rgba(102, 126, 234, 0.08)' : 'transparent'}
                        >
                          <span style={{
                            fontSize: '14px',
                            color: !task.parent_task_id ? '#667eea' : '#1a1a1a',
                            fontWeight: !task.parent_task_id ? '600' : '400'
                          }}>
                            None (top-level task)
                          </span>
                          {!task.parent_task_id && <Check size={16} color="#667eea" />}
                        </div>
                        {availableTasks.map(t => (
                          <div
                            key={t.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTask(index, 'parent_task_id', t.id);
                              setOpenDropdown(null);
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background 0.15s ease',
                              background: task.parent_task_id === t.id ? 'rgba(102, 126, 234, 0.08)' : 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = task.parent_task_id === t.id ? 'rgba(102, 126, 234, 0.08)' : 'transparent'}
                          >
                            <span style={{
                              fontSize: '14px',
                              color: task.parent_task_id === t.id ? '#667eea' : '#1a1a1a',
                              fontWeight: task.parent_task_id === t.id ? '600' : '400',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {t.title}
                            </span>
                            {task.parent_task_id === t.id && <Check size={16} color="#667eea" />}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Tag size={14} />
                  Tags
                </label>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  {task.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      style={{
                        background: `${tag.color}15`,
                        color: tag.color,
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {tag.name}
                      <button
                        onClick={() => removeTagFromTask(index, tagIndex)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'flex'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type tag name and press Enter"
                  value={tagInput[index] || ''}
                  onChange={(e) => setTagInput({ ...tagInput, [index]: e.target.value })}
                  onKeyDown={(e) => handleTagInputKeyDown(index, e)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13px',
                    border: '0.5px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.8)'
                  }}
                />
              </div>
            </div>
          ))}

          {/* Add Task Button */}
          <button
            onClick={addTask}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              border: '1px dashed #667eea',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            Add Another Task
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px',
          borderTop: '0.5px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(0, 0, 0, 0.05)',
              color: '#1a1a1a',
              border: 'none',
              borderRadius: '14px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1,
              padding: '14px',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
            }}
          >
            {loading ? 'Converting...' : `Create ${tasks.length} Task${tasks.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-8px) scaleY(0.95);
            transformOrigin: top;
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
            transformOrigin: top;
          }
        }
      `}</style>
    </>
  );
}
