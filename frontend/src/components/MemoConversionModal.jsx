import { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { tagsAPI } from '../services/api';

export default function MemoConversionModal({ isOpen, onClose, inboxItem, onConvert }) {
  const [memo, setMemo] = useState({
    title: '',
    content: inboxItem?.content || '',
    details: '',
    tags: []
  });
  const [availableTags, setAvailableTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTags();
      // Reset form when modal opens
      setMemo({
        title: '',
        content: inboxItem?.content || '',
        details: '',
        tags: []
      });
    }
  }, [isOpen, inboxItem]);

  const loadTags = async () => {
    try {
      const response = await tagsAPI.getAll();
      setAvailableTags(response.data.tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const addTag = (tag) => {
    if (!memo.tags.some(t => t.name === tag.name)) {
      setMemo({ ...memo, tags: [...memo.tags, tag] });
    }
    setTagInput('');
  };

  const removeTag = (index) => {
    const newTags = [...memo.tags];
    newTags.splice(index, 1);
    setMemo({ ...memo, tags: newTags });
  };

  const createNewTag = async (tagName) => {
    try {
      const response = await tagsAPI.create({ name: tagName, color: '#667eea' });
      const newTag = response.data.tag;
      setAvailableTags([...availableTags, newTag]);
      addTag(newTag);
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const existingTag = availableTags.find(t => t.name.toLowerCase() === tagInput.toLowerCase());
      if (existingTag) {
        addTag(existingTag);
      } else {
        createNewTag(tagInput.trim());
      }
    }
  };

  const handleSubmit = async () => {
    // Validate
    if (!memo.title.trim()) {
      alert('Please provide a title for the memo');
      return;
    }
    if (!memo.content.trim()) {
      alert('Memo content cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await onConvert(memo);
      onClose();
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Failed to convert inbox item to memo');
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
        top: '2.5vh',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '95%',
        maxWidth: '600px',
        height: '95vh',
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
            Convert to Memo
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

        {/* Form */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          WebkitOverflowScrolling: 'touch'
        }}>
          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '8px',
              display: 'block'
            }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="Give this memo a title"
              value={memo.title}
              onChange={(e) => setMemo({ ...memo, title: e.target.value })}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                border: '0.5px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.8)',
                fontWeight: '600'
              }}
            />
          </div>

          {/* Content */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '8px',
              display: 'block'
            }}>
              Content *
            </label>
            <textarea
              placeholder="Main content of the memo"
              value={memo.content}
              onChange={(e) => setMemo({ ...memo, content: e.target.value })}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                border: '0.5px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.8)',
                minHeight: '160px',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.6'
              }}
            />
          </div>

          {/* Details */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '8px',
              display: 'block'
            }}>
              Details (optional)
            </label>
            <textarea
              placeholder="Additional details, context, or notes"
              value={memo.details}
              onChange={(e) => setMemo({ ...memo, details: e.target.value })}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                border: '0.5px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.8)',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5',
                color: '#666'
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Tag size={14} />
              Tags
            </label>

            {/* Selected Tags */}
            {memo.tags.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '12px'
              }}>
                {memo.tags.map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      background: `${tag.color}15`,
                      color: tag.color,
                      padding: '6px 12px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() => removeTag(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        display: 'flex',
                        color: tag.color
                      }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag Input */}
            <input
              type="text"
              placeholder="Type tag name and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                border: '0.5px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.8)'
              }}
            />

            {/* Tag Suggestions */}
            {tagInput && availableTags.filter(t =>
              t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
              !memo.tags.some(mt => mt.name === t.name)
            ).length > 0 && (
              <div style={{
                marginTop: '8px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '0.5px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '12px',
                padding: '8px',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {availableTags
                  .filter(t =>
                    t.name.toLowerCase().includes(tagInput.toLowerCase()) &&
                    !memo.tags.some(mt => mt.name === t.name)
                  )
                  .map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => addTag(tag)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textAlign: 'left',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.04)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <span style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '4px',
                        background: tag.color
                      }} />
                      {tag.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
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
            {loading ? 'Creating...' : 'Create Memo'}
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
      `}</style>
    </>
  );
}
