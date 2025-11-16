import { useState, useEffect, useRef } from 'react';
import { memosAPI } from '../services/api';
import { Plus, Loader2, Trash2, BookOpen, Tag, Edit2 } from 'lucide-react';

export default function Memos() {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadMemos();
  }, []);

  const loadMemos = async () => {
    try {
      setError('');
      const response = await memosAPI.getAll();
      setMemos(response.data.memos || []);
    } catch (error) {
      setError('Failed to load memos');
      console.error('Load memos error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMemo = async (id) => {
    if (!confirm('Are you sure you want to delete this memo?')) return;

    try {
      await memosAPI.delete(id);
      setMemos(memos.filter((memo) => memo.id !== id));
    } catch (error) {
      setError('Failed to delete memo');
      console.error('Delete memo error:', error);
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

        {/* Header with Add Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1a1a1a',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            Memos
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            New Memo
          </button>
        </div>

        {/* Memos List */}
        <div>
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#8e8e93',
              fontSize: '15px'
            }}>
              <Loader2 size={24} className="spin" style={{ marginBottom: '12px' }} />
              <div>Loading memos...</div>
            </div>
          ) : memos.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#8e8e93'
            }}>
              <BookOpen size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontSize: '17px', marginBottom: '8px', fontWeight: '600', color: '#1a1a1a' }}>
                No memos yet
              </p>
              <p style={{ fontSize: '14px' }}>
                Create your first memo to save important information
              </p>
            </div>
          ) : (
            memos.map((memo) => (
              <div
                key={memo.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(40px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                  borderRadius: '20px',
                  padding: '20px',
                  marginBottom: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06), 0 1px 0 0 rgba(255, 255, 255, 0.5) inset',
                  border: '0.5px solid rgba(255, 255, 255, 0.8)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{
                    fontSize: '17px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    margin: 0,
                    flex: 1
                  }}>
                    {memo.title}
                  </h3>
                  <button
                    onClick={() => handleDeleteMemo(memo.id)}
                    style={{
                      padding: '8px',
                      background: 'rgba(255, 59, 48, 0.1)',
                      color: '#ff3b30',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: '12px'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p style={{
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#1a1a1a',
                  marginBottom: memo.details ? '12px' : '8px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {memo.content}
                </p>

                {memo.details && (
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#8e8e93',
                    marginBottom: '12px',
                    whiteSpace: 'pre-wrap',
                    fontStyle: 'italic'
                  }}>
                    {memo.details}
                  </p>
                )}

                {/* Tags */}
                {memo.tags && memo.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {memo.tags.map((tag, index) => (
                      <span
                        key={index}
                        style={{
                          background: `${tag.color}15`,
                          color: tag.color,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Tag size={11} />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div style={{
                  fontSize: '12px',
                  color: '#8e8e93',
                  marginTop: '12px',
                  fontWeight: '500'
                }}>
                  {new Date(memo.updated_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
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
