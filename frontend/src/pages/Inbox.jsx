import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Mic, Square, Loader2, Trash2, ArrowRight, Plus } from 'lucide-react';

export default function Inbox() {
  const [items, setItems] = useState([]);
  const [newContent, setNewContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const inputRef = useRef(null);

  useEffect(() => {
    loadInboxItems();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const loadInboxItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inbox');
      setItems(response.data);
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
      const response = await api.post('/inbox', {
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
      await api.delete(`/inbox/${id}`);
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Delete inbox item error:', err);
      setError('Failed to delete item');
    }
  };

  const handleConvertToTask = async (id) => {
    try {
      await api.post(`/inbox/${id}/convert-to-task`, {
        deleteAfterConvert: true,
      });

      setItems(items.filter((item) => item.id !== id));
      setError('');
    } catch (err) {
      console.error('Convert to task error:', err);
      setError('Failed to convert to task');
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

      const response = await api.post('/inbox/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
              {/* Add Button */}
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

              {/* Voice Button */}
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
                Your inbox is empty
              </p>
              <p style={{ fontSize: '14px' }}>
                Start capturing your thoughts above
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
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
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, marginRight: '16px' }}>
                    <p style={{
                      fontSize: '15px',
                      lineHeight: '1.5',
                      marginBottom: '12px',
                      color: '#1a1a1a',
                      fontWeight: '400'
                    }}>
                      {item.content}
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#8e8e93',
                      gap: '10px',
                      fontWeight: '500'
                    }}>
                      <span style={{
                        background: item.source === 'voice' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(102, 126, 234, 0.1)',
                        color: item.source === 'voice' ? '#34c759' : '#667eea',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {item.source === 'voice' ? <Mic size={12} /> : <Plus size={12} />}
                        {item.source === 'voice' ? 'Voice' : 'Manual'}
                      </span>
                      <span>
                        {new Date(item.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleConvertToTask(item.id)}
                      style={{
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <ArrowRight size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{
                        padding: '10px',
                        fontSize: '13px',
                        fontWeight: '600',
                        background: 'rgba(255, 59, 48, 0.1)',
                        color: '#ff3b30',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
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
