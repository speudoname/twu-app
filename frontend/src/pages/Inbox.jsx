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
    const [showDelayOptions, setShowDelayOptions] = useState(false);
    const [swipeXOverride, setSwipeXOverride] = useState(null);

    const { swipeX, isSwiping, isRevealed, revealedDirection, confirmAction, cancelReveal, handlers } = useSwipeGesture({
      onSwipeLeft: () => {}, // Delay + Delete on left swipe
      onSwipeRight: () => {}, // Task + Memo on right swipe
      threshold: 80,
      maxSwipeLeft: showDelayOptions ? 240 : 120, // Expand to 240px when showing delay options
      maxSwipeRight: 120 // Task + Memo buttons width (60px each)
    });

    // When delay options are shown, expand the swipe distance
    useEffect(() => {
      if (showDelayOptions && isRevealed && revealedDirection === 'left') {
        // Expand to full 240px
        setSwipeXOverride(-240);
      } else {
        setSwipeXOverride(null);
      }
    }, [showDelayOptions, isRevealed, revealedDirection]);

    // Reset delay options when swipe is cancelled
    const handleCancelReveal = () => {
      setShowDelayOptions(false);
      setSwipeXOverride(null);
      cancelReveal();
    };

    // Also reset when direction changes
    useEffect(() => {
      if (!isRevealed) {
        setShowDelayOptions(false);
        setSwipeXOverride(null);
      }
    }, [isRevealed]);

    const handleDelay = async (hours) => {
      try {
        const delayUntil = new Date();
        delayUntil.setHours(delayUntil.getHours() + hours);

        // Call delay API
        await inboxAPI.delay(item.id, delayUntil.toISOString());

        // Remove item from list if in 'active' filter
        if (statusFilter === 'active') {
          setItems(items.filter((i) => i.id !== item.id));
        } else {
          // Reload to update the item
          loadInboxItems();
        }

        setShowDelayOptions(false);
        cancelReveal();
      } catch (error) {
        console.error('Failed to delay item:', error);
        setError('Failed to delay item');
      }
    };

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
        {/* Backdrop to cancel reveal */}
        {isRevealed && (
          <div
            onClick={handleCancelReveal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
              background: 'transparent'
            }}
          />
        )}

        {/* Action Buttons Behind - Gmail Style */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          overflow: 'hidden',
          zIndex: 2,
          pointerEvents: 'none'
        }}>
          {/* Left: Task + Memo (shown on swipe right) */}
          <div style={{
            display: 'flex',
            width: '120px',
            opacity: swipeX > 20 || (isRevealed && revealedDirection === 'right') ? 1 : 0,
            transition: 'opacity 0.2s',
            pointerEvents: (isRevealed && revealedDirection === 'right') ? 'auto' : 'none'
          }}>
            {/* Task Button - 60px width */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTaskModal(item);
                handleCancelReveal();
              }}
              style={{
                width: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: '#34c759',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontWeight: '600',
                fontSize: '11px',
                padding: 0
              }}
            >
              <ListTodo size={18} strokeWidth={2.5} />
              <span>Task</span>
            </button>

            {/* Memo Button - 60px width */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenMemoModal(item);
                handleCancelReveal();
              }}
              style={{
                width: '60px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: '#667eea',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                fontWeight: '600',
                fontSize: '11px',
                padding: 0
              }}
            >
              <BookOpen size={18} strokeWidth={2.5} />
              <span>Memo</span>
            </button>
          </div>

          {/* Right: Delay + Delete or Delay Time Options (shown on swipe left) */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            width: showDelayOptions ? '240px' : '120px',
            opacity: swipeX < -20 || (isRevealed && revealedDirection === 'left') ? 1 : 0,
            transition: 'opacity 0.2s, width 0.3s',
            pointerEvents: (isRevealed && revealedDirection === 'left') ? 'auto' : 'none'
          }}>
            {!showDelayOptions ? (
              <>
                {/* Delay Button - 60px width */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDelayOptions(true);
                  }}
                  style={{
                    width: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: '#ff9500',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '11px',
                    padding: 0
                  }}
                >
                  <Clock size={18} strokeWidth={2.5} />
                  <span>Delay</span>
                </button>

                {/* Delete Button - 60px width */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                    handleCancelReveal();
                  }}
                  style={{
                    width: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: '#ff3b30',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '11px',
                    padding: 0
                  }}
                >
                  <Trash2 size={18} strokeWidth={2.5} />
                  <span>Delete</span>
                </button>
              </>
            ) : (
              <>
                {/* Delay Time Options - Full height gradient buttons */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelay(1);
                  }}
                  style={{
                    width: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #ff9500 0%, #ff7700 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '13px',
                    padding: 0
                  }}
                >
                  <Clock size={16} strokeWidth={2.5} />
                  <span>1h</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelay(24);
                  }}
                  style={{
                    width: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #ff7700 0%, #ff6600 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '12px',
                    padding: 0
                  }}
                >
                  <Clock size={16} strokeWidth={2.5} />
                  <span style={{ fontSize: '11px' }}>Tomorrow</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelay(24 * 7);
                  }}
                  style={{
                    width: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #ff6600 0%, #ff5500 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '12px',
                    padding: 0
                  }}
                >
                  <Clock size={16} strokeWidth={2.5} />
                  <span style={{ fontSize: '11px' }}>1 Week</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelay(24 * 30);
                  }}
                  style={{
                    width: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'linear-gradient(135deg, #ff5500 0%, #ff3b30 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '12px',
                    padding: 0
                  }}
                >
                  <Clock size={16} strokeWidth={2.5} />
                  <span style={{ fontSize: '11px' }}>1 Month</span>
                </button>
              </>
            )}
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
            padding: '18px 20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
            border: '0.5px solid rgba(255, 255, 255, 0.8)',
            cursor: 'grab',
            transform: `translateX(${swipeXOverride !== null ? swipeXOverride : swipeX}px)`,
            transition: (isSwiping || isRevealed || swipeXOverride !== null) ? swipeXOverride !== null ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            touchAction: 'pan-y',
            zIndex: isRevealed ? 3 : 1
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
