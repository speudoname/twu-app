import { useState, useRef, useCallback } from 'react';

/**
 * Custom hook for handling swipe gestures on touch/mouse devices
 *
 * @param {Object} options
 * @param {Function} options.onSwipeLeft - Callback when left swipe completes
 * @param {Function} options.onSwipeRight - Callback when right swipe completes
 * @param {number} options.threshold - Minimum distance (px) to trigger action (default: 100)
 * @param {boolean} options.requireHorizontal - Only trigger on horizontal swipes (default: true)
 *
 * @returns {Object} { swipeX, isSwiping, handlers }
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  requireHorizontal = true
}) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const hasDeterminedDirection = useRef(false);

  const handleStart = useCallback((clientX, clientY) => {
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    touchCurrentX.current = clientX;
    hasDeterminedDirection.current = false;
    isHorizontalSwipe.current = false;
  }, []);

  const handleMove = useCallback((clientX, clientY) => {
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

      // Limit swipe distance to reasonable bounds
      const limitedDeltaX = Math.max(-200, Math.min(200, deltaX));
      setSwipeX(limitedDeltaX);
    }
  }, [requireHorizontal]);

  const handleEnd = useCallback(() => {
    const finalDeltaX = touchCurrentX.current - touchStartX.current;
    const velocity = Math.abs(finalDeltaX);

    // Determine if swipe completed (either distance or velocity)
    const completed = Math.abs(finalDeltaX) > threshold || velocity > 50;

    if (completed && isHorizontalSwipe.current) {
      if (finalDeltaX < 0 && onSwipeLeft) {
        // Swipe left
        onSwipeLeft();
      } else if (finalDeltaX > 0 && onSwipeRight) {
        // Swipe right
        onSwipeRight();
      }
    }

    // Reset state with animation
    setSwipeX(0);
    setTimeout(() => setIsSwiping(false), 300);

    // Reset refs
    touchStartX.current = 0;
    touchStartY.current = 0;
    touchCurrentX.current = 0;
    hasDeterminedDirection.current = false;
    isHorizontalSwipe.current = false;
  }, [threshold, onSwipeLeft, onSwipeRight]);

  // Touch event handlers
  const onTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const onTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);

    // Prevent scroll if swiping horizontally
    if (isHorizontalSwipe.current) {
      e.preventDefault();
    }
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
    setSwipeX(0);
    setIsSwiping(false);
  }, []);

  return {
    swipeX,
    isSwiping,
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
