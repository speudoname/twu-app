import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, Timer } from 'lucide-react';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

export default function PomodoroTimer({ isOpen, onClose, onPomodoroComplete, taskTitle }) {
  const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // 'work', 'shortBreak', 'longBreak'
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);

    // Play notification sound
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio error:', e);
    }

    if (mode === 'work') {
      const newCount = pomodorosCompleted + 1;
      setPomodorosCompleted(newCount);
      onPomodoroComplete(newCount);

      // After 4 pomodoros, suggest long break
      if (newCount % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(LONG_BREAK);
      } else {
        setMode('shortBreak');
        setTimeLeft(SHORT_BREAK);
      }
    } else {
      // Break ended, back to work
      setMode('work');
      setTimeLeft(POMODORO_DURATION);
    }
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? POMODORO_DURATION : (mode === 'shortBreak' ? SHORT_BREAK : LONG_BREAK));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalDuration = mode === 'work' ? POMODORO_DURATION : (mode === 'shortBreak' ? SHORT_BREAK : LONG_BREAK);
    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  const getModeColor = () => {
    if (mode === 'work') return '#667eea';
    if (mode === 'shortBreak') return '#34c759';
    return '#ff9500';
  };

  const getModeLabel = () => {
    if (mode === 'work') return 'Focus Time';
    if (mode === 'shortBreak') return 'Short Break';
    return 'Long Break';
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
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '400px',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: '0.5px solid rgba(255, 255, 255, 0.8)',
        zIndex: 2001,
        padding: '32px 24px',
        animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
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

        {/* Task Title */}
        <div style={{
          marginBottom: '24px',
          paddingRight: '40px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#8e8e93',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Working on
          </div>
          <div style={{
            fontSize: '17px',
            fontWeight: '600',
            color: '#1a1a1a',
            lineHeight: '1.3'
          }}>
            {taskTitle}
          </div>
        </div>

        {/* Mode Label */}
        <div style={{
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <span style={{
            background: `${getModeColor()}15`,
            color: getModeColor(),
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Timer size={16} />
            {getModeLabel()}
          </span>
        </div>

        {/* Circular Progress */}
        <div style={{
          position: 'relative',
          width: '240px',
          height: '240px',
          margin: '0 auto 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Background Circle */}
          <svg width="240" height="240" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
            <circle
              cx="120"
              cy="120"
              r="110"
              fill="none"
              stroke="rgba(0, 0, 0, 0.05)"
              strokeWidth="12"
            />
            <circle
              cx="120"
              cy="120"
              r="110"
              fill="none"
              stroke={getModeColor()}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 110}`}
              strokeDashoffset={`${2 * Math.PI * 110 * (1 - getProgress() / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>

          {/* Time Display */}
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <div style={{
              fontSize: '56px',
              fontWeight: '700',
              color: '#1a1a1a',
              fontFamily: 'monospace',
              letterSpacing: '-2px'
            }}>
              {formatTime(timeLeft)}
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: '#8e8e93',
              marginTop: '8px'
            }}>
              {pomodorosCompleted} {pomodorosCompleted === 1 ? 'pomodoro' : 'pomodoros'} completed
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={resetTimer}
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.1)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(0, 0, 0, 0.05)'}
          >
            <RotateCcw size={24} color="#1a1a1a" />
          </button>

          <button
            onClick={toggleTimer}
            style={{
              background: `linear-gradient(135deg, ${getModeColor()} 0%, ${getModeColor()}dd 100%)`,
              border: 'none',
              borderRadius: '20px',
              padding: '20px 48px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: `0 8px 20px ${getModeColor()}40`,
              transition: 'all 0.2s'
            }}
          >
            {isRunning ? (
              <>
                <Pause size={24} />
                Pause
              </>
            ) : (
              <>
                <Play size={24} />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>
    </>
  );
}
