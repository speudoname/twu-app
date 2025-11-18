import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for handling swipe gestures with reveal-confirm pattern
 *
 * @param {Object} options
 * @param {Function} options.onSwipeLeft - Callback when left swipe action is confirmed
 * @param {Function} options.onSwipeRight - Callback when right swipe action is confirmed
 * @param {number} options.threshold - Minimum distance (px) to trigger reveal (default: 100)
 * @param {number} options.maxSwipeLeft - Maximum distance (px) for left swipe (default: 100)
 * @param {number} options.maxSwipeRight - Maximum distance (px) for right swipe (default: 100)
 * @param {boolean} options.requireHorizontal - Only trigger on horizontal swipes (default: true)
 *
 * @returns {Object} { swipeX, isSwiping, isRevealed, revealedDirection, confirmAction, cancelReveal, handlers }
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  maxSwipeLeft = 100,
  maxSwipeRight = 100,
  requireHorizontal = true
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [revealedDirection, setRevealedDirection] = useState(null); // 'left' | 'right' | null

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const hasDeterminedDirection = useRef(false);

  // Cancel the reveal and slide back to center
  const cancelReveal = useCallback(() => {
    setIsRevealed(false);
    setRevealedDirection(null);
    setSwipeX(0);
    setIsSwiping(false);

    // Reset refs
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchCurrentX.current = 0;
    hasDeterminedDirection.current = false;
    isHorizontalSwipe.current = false;
  }, []);

  const handleStart = useCallback((clientX, clientY) => {
    // If already revealed, cancel reveal on new touch
    if (isRevealed) {
      cancelReveal();
      return;
    }

    touchStartX.current = clientX;
    touchStartY.current = clientY;
    touchCurrentX.current = clientX;
    hasDeterminedDirection.current = false;
    isHorizontalSwipe.current = false;
  }, [isRevealed, cancelReveal]);

  const handleMove = useCallback((clientX, clientY) => {
    // Don't allow swiping if already revealed
    if (isRevealed) return;

    const deltaX = clientX - touchStartX.current;
    const deltaY = clientY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (!hasDeterminedDirection.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      hasDeterminedDirection.current = true;
      isHorizontalSwipe.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // Only allow horizontal swipes if required
    if (requireHorizontal && hasDeterminedDirection.current && !isHorizontalSwipe.current) {
      return;
    }

    // If we've determined it's a horizontal swipe, start tracking
    if (isHorizontalSwipe.current || !requireHorizontal) {
      setIsSwiping(true);
      touchCurrentX.current = clientX;

      // Limit swipe distance to button widths
      const limitedDeltaX = Math.max(-maxSwipeLeft, Math.min(maxSwipeRight, deltaX));
      setSwipeX(limitedDeltaX);
    }
  }, [requireHorizontal, isRevealed, maxSwipeLeft, maxSwipeRight]);

  const handleEnd = useCallback(() => {
    const finalDeltaX = touchCurrentX.current - touchStartX.current;
    const velocity = Math.abs(finalDeltaX);

    // Determine if swipe completed (either distance or velocity)
    const completed = Math.abs(finalDeltaX) > threshold || velocity > 50;

    if (completed && isHorizontalSwipe.current) {
      if (finalDeltaX < 0 && onSwipeLeft) {
        // Swipe left - lock at max left distance
        setSwipeX(-maxSwipeLeft);
        setIsRevealed(true);
        setRevealedDirection('left');
        setIsSwiping(false);
        return; // Don't reset, keep revealed
      } else if (finalDeltaX > 0 && onSwipeRight) {
        // Swipe right - lock at max right distance
        setSwipeX(maxSwipeRight);
        setIsRevealed(true);
        setRevealedDirection('right');
        setIsSwiping(false);
        return; // Don't reset, keep revealed
      }
    }

    // If swipe didn't complete, snap back to center
    setSwipeX(0);
    setTimeout(() => setIsSwiping(false), 300);

    // Reset refs
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchCurrentX.current = 0;
    hasDeterminedDirection.current = false;
    isHorizontalSwipe.current = false;
  }, [threshold, maxSwipeLeft, maxSwipeRight, onSwipeLeft, onSwipeRight]);

  // Confirm the revealed action (call the actual callback)
  const confirmAction = useCallback(() => {
    if (!isRevealed) return;

    if (revealedDirection === 'left' && onSwipeLeft) {
      onSwipeLeft();
    } else if (revealedDirection === 'right' && onSwipeRight) {
      onSwipeRight();
    }

    // Reset state
    setIsRevealed(false);
    setRevealedDirection(null);
    setSwipeX(0);
  }, [isRevealed, revealedDirection, onSwipeLeft, onSwipeRight]);

  // Touch event handlers
  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const onTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
    // Note: preventDefault removed - using touchAction: 'pan-y' on elements instead
  }, [handleMove]);

  const onTouchEnd = useCallback(() => {
    handleEnd();
  }, [handleEnd]);

  // Mouse event handlers (for desktop testing)
  const mouseDownRef = useRef(false);

  const onMouseDown = useCallback((e) => {
    mouseDownRef.current = true;
    handleStart(e.clientX, e.clientY);
  }, [handleStart]);

  const onMouseMove = useCallback((e) => {
    if (!mouseDownRef.current) return;
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  const onMouseUp = useCallback(() => {
    if (!mouseDownRef.current) return;
    mouseDownRef.current = false;
    handleEnd();
  }, [handleEnd]);

  const onMouseLeave = useCallback(() => {
    if (!mouseDownRef.current) return;
    mouseDownRef.current = false;

    // If revealed, keep it revealed. Otherwise snap back.
    if (!isRevealed) {
      setSwipeX(0);
      setIsSwiping(false);
    }
  }, [isRevealed]);

  return {
    swipeX,
    isSwiping,
    isRevealed,
    revealedDirection,
    confirmAction,
    cancelReveal,
    isHorizontalSwipe: isHorizontalSwipe.current,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave
    }
  };
}
