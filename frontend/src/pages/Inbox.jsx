import { useState, useEffect, useRef } from 'react';
import { inboxAPI } from '../services/api';
import { Mic, Square, Loader2, Trash2, Plus, Clock, ListTodo, BookOpen, Eye, EyeOff } from 'lucide-react';
import TaskConversionModal from '../components/TaskConversionModal';
import MemoConversionModal from '../components/MemoConversionModal';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

export default function Inbox() {
  const [items, setItems] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('active'); // 'active', 'delayed', 'all'
  const [taskConversionModal, setTaskConversionModal] = useState({ isOpen: false, item: null });
  const [memoConversionModal, setMemoConversionModal] = useState({ isOpen: false, item: null });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const inputRef = useRef(null);

  useEffect(() => {
    loadInboxItems();
    // Removed auto-focus to prevent keyboard popup on mobile

    // Cleanup: blur input when component unmounts to prevent focus restoration on mobile
    return () => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    };
  }, [statusFilter]);

  const loadInboxItems = async () => {
    try {
      setLoading(true);
      const response = await inboxAPI.getAll(statusFilter);
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Load inbox error:', err);
      setError('Failed to load inbox items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      setLoading(true);
      const response = await inboxAPI.create({
        content: newContent,
        source: 'manual',
      });

      setItems([response.data, ...items]);
      setNewContent('');
      setError('');

      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error('Create inbox item error:', err);
      setError('Failed to create inbox item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await inboxAPI.delete(id);
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Delete inbox item error:', err);
      setError('Failed to delete item');
    }
  };

  const handleQuickConvertToTask = async (id, content) => {
    try {
      // Quick convert: create one task with the inbox content as title
      await inboxAPI.convertToTasks(id, [{
        title: content,
        importance: 5,
        urgency: 5
      }]);

      setItems(items.filter((item) => item.id !== id));
      setError('');
    } catch (err) {
      console.error('Convert to task error:', err);
      setError('Failed to convert to task');
    }
  };

  const handleOpenTaskModal = (item) => {
    setTaskConversionModal({ isOpen: true, item });
  };

  const handleOpenMemoModal = (item) => {
    setMemoConversionModal({ isOpen: true, item });
  };

  const handleTaskConversion = async (tasks) => {
    try {
      await inboxAPI.convertToTasks(taskConversionModal.item.id, tasks);
      setItems(items.filter((item) => item.id !== taskConversionModal.item.id));
      setTaskConversionModal({ isOpen: false, item: null });
    } catch (error) {
      console.error('Task conversion failed:', error);
      throw error;
    }
  };

  const handleMemoConversion = async (memo) => {
    try {
      await inboxAPI.convertToMemo(memoConversionModal.item.id, memo);
      setItems(items.filter((item) => item.id !== memoConversionModal.item.id));
      setMemoConversionModal({ isOpen: false, item: null });
    } catch (error) {
      console.error('Memo conversion failed:', error);
      throw error;
    }
  };

  const handleDelayUntilTomorrow = async (id) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM tomorrow

      await inboxAPI.delay(id, tomorrow.toISOString());

      if (statusFilter === 'active') {
        setItems(items.filter((item) => item.id !== id));
      } else {
        loadInboxItems(); // Reload to update the item
      }
      setError('');
    } catch (err) {
      console.error('Delay item error:', err);
      setError('Failed to delay item');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError('');
    } catch (err) {
      console.error('Recording error:', err);
      setError('Failed to start recording. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      setIsTranscribing(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await inboxAPI.transcribe(formData);

      setItems([response.data.item, ...items]);
      setError('');
    } catch (err) {
      console.error('Transcription error:', err);
      setError(
        err.response?.data?.error ||
          'Failed to transcribe audio. Please try again.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // Swipeable Inbox Item Component
  const SwipeableInboxItem = ({ item }) => {
    const { swipeX, isSwiping, handlers } = useSwipeGesture({
      onSwipeLeft: () => handleDelete(item.id),
      onSwipeRight: () => handleOpenTaskModal(item),
      threshold: 100
    });

    const formatTime = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / 60000);

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const getSourceColor = (source) => {
      const colors = {
        email: '#667eea',
        transcription: '#34c759',
        manual: '#8e8e93'
      };
      return colors[source] || '#8e8e93';
    };

    return (
      <div style={{
        position: 'relative',
        marginBottom: '12px',
        overflow: 'hidden',
        borderRadius: '20px'
      }}>
        {/* Action Buttons Behind */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px'
        }}>
          {/* Left: Convert to Task (shown on swipe right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            fontWeight: '600',
            fontSize: '15px',
            opacity: swipeX > 20 ? 1 : 0,
            transition: 'opacity 0.2s',
            background: 'linear-gradient(135deg, #34c759 0%, #30d158 100%)',
            padding: '10px 16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)'
          }}>
            <ListTodo size={18} />
            Task
          </div>

          {/* Right: Delete (shown on swipe left) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            fontWeight: '600',
            fontSize: '15px',
            opacity: swipeX < -20 ? 1 : 0,
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

        {/* Card Content */}
        <div
          {...handlers}
          style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderRadius: '20px',
            padding: '18px 20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
            border: '0.5px solid rgba(255, 255, 255, 0.8)',
            cursor: 'grab',
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            touchAction: 'pan-y'
          }}
        >
          {/* Content */}
          <p style={{
            margin: '0 0 12px 0',
            fontSize: '15px',
            lineHeight: '1.5',
            color: '#1a1a1a',
            fontWeight: '400'
          }}>
            {item.content}
          </p>

          {/* Metadata */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Source Badge */}
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: getSourceColor(item.source),
              background: `${getSourceColor(item.source)}15`,
              padding: '4px 10px',
              borderRadius: '8px',
              textTransform: 'capitalize'
            }}>
              {item.source}
            </span>

            {/* Delayed Badge */}
            {item.status === 'delayed' && item.delayed_until && (
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#ff9500',
                background: '#ff950015',
                padding: '4px 10px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Clock size={12} />
                Until {new Date(item.delayed_until).toLocaleDateString()}
              </span>
            )}

            {/* Timestamp */}
            <span style={{
              fontSize: '12px',
              color: '#8e8e93',
              marginLeft: 'auto'
            }}>
              {formatTime(item.created_at)}
            </span>
          </div>
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

        {/* Status Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '16px',
          padding: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
          border: '0.5px solid rgba(255, 255, 255, 0.8)',
        }}>
          <button
            onClick={() => setStatusFilter('active')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              fontWeight: '600',
              background: statusFilter === 'active'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'transparent',
              color: statusFilter === 'active' ? 'white' : '#8e8e93',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Eye size={16} />
            Active
          </button>
          <button
            onClick={() => setStatusFilter('delayed')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              fontWeight: '600',
              background: statusFilter === 'delayed'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'transparent',
              color: statusFilter === 'delayed' ? 'white' : '#8e8e93',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Clock size={16} />
            Delayed
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              fontWeight: '600',
              background: statusFilter === 'all'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'transparent',
              color: statusFilter === 'all' ? 'white' : '#8e8e93',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <EyeOff size={16} />
            All
          </button>
        </div>

        {/* Input Card - Glass Morphism */}
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
          <form onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What's on your mind?"
              disabled={isTranscribing}
              style={{
                width: '100%',
                fontSize: '16px',
                padding: '0',
                border: 'none',
                background: 'transparent',
                resize: 'none',
                minHeight: '80px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
                lineHeight: '1.5',
                outline: 'none',
                color: '#1a1a1a',
                marginBottom: '16px',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.caretColor = '#667eea'}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={!newContent.trim() || loading || isTranscribing}
                style={{
                  flex: 1,
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: '600',
                  background: newContent.trim() && !loading && !isTranscribing
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'rgba(0, 0, 0, 0.05)',
                  color: newContent.trim() && !loading && !isTranscribing ? 'white' : '#8e8e93',
                  border: 'none',
                  borderRadius: '14px',
                  cursor: newContent.trim() && !loading && !isTranscribing ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: newContent.trim() && !loading && !isTranscribing
                    ? '0 4px 12px rgba(102, 126, 234, 0.4)'
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {loading ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                {loading ? 'Adding...' : 'Add'}
              </button>

              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                style={{
                  padding: '14px 20px',
                  fontSize: '15px',
                  fontWeight: '600',
                  background: isRecording
                    ? 'linear-gradient(135deg, #ff3b30 0%, #ff6b6b 100%)'
                    : isTranscribing
                    ? 'rgba(0, 0, 0, 0.05)'
                    : 'linear-gradient(135deg, #34c759 0%, #30d158 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '14px',
                  cursor: isTranscribing ? 'not-allowed' : 'pointer',
                  minWidth: '60px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isRecording
                    ? '0 4px 12px rgba(255, 59, 48, 0.4)'
                    : isTranscribing
                    ? 'none'
                    : '0 4px 12px rgba(52, 199, 89, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isRecording ? (
                  <Square size={18} fill="white" />
                ) : isTranscribing ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  <Mic size={18} />
                )}
              </button>
            </div>
          </form>

          {isTranscribing && (
            <p style={{
              textAlign: 'center',
              color: '#8e8e93',
              marginTop: '16px',
              marginBottom: 0,
              fontSize: '13px',
              fontWeight: '500'
            }}>
              Transcribing your voice...
            </p>
          )}
        </div>

        {/* Inbox Items */}
        <div>
          {loading && items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#8e8e93',
              fontSize: '15px'
            }}>
              <Loader2 size={24} className="spin" style={{ marginBottom: '12px' }} />
              <div>Loading inbox...</div>
            </div>
          ) : items.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#8e8e93'
            }}>
              <p style={{ fontSize: '17px', marginBottom: '8px', fontWeight: '600', color: '#1a1a1a' }}>
                {statusFilter === 'delayed' ? 'No delayed items' : 'Your inbox is empty'}
              </p>
              <p style={{ fontSize: '14px' }}>
                {statusFilter === 'delayed'
                  ? 'Items you delay will appear here'
                  : 'Start capturing your thoughts above'}
              </p>
            </div>
          ) : (
            items.map((item) => <SwipeableInboxItem key={item.id} item={item} />)
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
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Conversion Modals */}
      <TaskConversionModal
        isOpen={taskConversionModal.isOpen}
        onClose={() => setTaskConversionModal({ isOpen: false, item: null })}
        inboxItem={taskConversionModal.item}
        onConvert={handleTaskConversion}
      />

      <MemoConversionModal
        isOpen={memoConversionModal.isOpen}
        onClose={() => setMemoConversionModal({ isOpen: false, item: null })}
        inboxItem={memoConversionModal.item}
        onConvert={handleMemoConversion}
      />
    </div>
  );
}
