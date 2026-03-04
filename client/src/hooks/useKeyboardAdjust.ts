import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track keyboard height on mobile devices using Visual Viewport API.
 * Returns the offset that should be applied to fixed bottom elements to stay above the keyboard.
 * 
 * On mobile, when the virtual keyboard opens:
 * - window.innerHeight stays the same
 * - visualViewport.height shrinks to the visible area above the keyboard
 * - keyboard height = window.innerHeight - visualViewport.height
 */
export function useKeyboardAdjust() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const updateKeyboardHeight = useCallback(() => {
    if (typeof window !== 'undefined' && 'visualViewport' in window && window.visualViewport) {
      const viewport = window.visualViewport;
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
      setKeyboardHeight(keyboardHeight);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window) || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;
    
    // Listen to resize and scroll events on visual viewport
    viewport.addEventListener('resize', updateKeyboardHeight);
    viewport.addEventListener('scroll', updateKeyboardHeight);
    
    // Initial check
    updateKeyboardHeight();

    return () => {
      viewport.removeEventListener('resize', updateKeyboardHeight);
      viewport.removeEventListener('scroll', updateKeyboardHeight);
    };
  }, [updateKeyboardHeight]);

  return keyboardHeight;
}
