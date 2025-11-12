import React, { useState, useEffect } from 'react';
import { tasksAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    loadTasks();
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
        description: newTaskDescription,
      });

      if (response.data.success) {
        setTasks([response.data.task, ...tasks]);
        setNewTaskTitle('');
        setNewTaskDescription('');
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
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

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

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="container">
      <div className="tasks-container">
        <div className="tasks-header">
          <h2>My Tasks</h2>
          <div>Welcome, {user?.name || user?.email}</div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleAddTask} className="task-input">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={addingTask}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            disabled={addingTask}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={addingTask || !newTaskTitle.trim()}
          >
            {addingTask ? 'Adding...' : 'Add Task'}
          </button>
        </form>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <h3>No tasks yet</h3>
            <p>Add your first task above to get started!</p>
          </div>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-item">
                <input
                  type="checkbox"
                  className="task-checkbox"
                  checked={task.completed === 1}
                  onChange={() => handleToggleTask(task.id)}
                />
                <div className="task-content">
                  <div className={`task-title ${task.completed ? 'completed' : ''}`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="task-description">{task.description}</div>
                  )}
                </div>
                <div className="task-actions">
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="delete"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Tasks;