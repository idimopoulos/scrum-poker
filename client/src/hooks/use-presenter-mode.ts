import { useState, useEffect } from 'react';

export function usePresenterMode() {
  const [isPresenterMode, setIsPresenterMode] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Detect potential screen sharing scenarios
  useEffect(() => {
    const detectScreenSharing = () => {
      const isVisible = !document.hidden;
      const isFocused = document.hasFocus();
      const largeDisplay = window.screen.width >= 1920 && window.screen.height >= 1080;
      const multipleDisplays = window.screen.availWidth !== window.screen.width;
      
      // Heuristic: visible but not focused might indicate screen sharing
      const potentialScreenShare = isVisible && !isFocused;
      const likelyPresentationSetup = largeDisplay && multipleDisplays;
      
      return potentialScreenShare || likelyPresentationSetup;
    };

    const handleVisibilityChange = () => {
      setIsScreenSharing(detectScreenSharing());
    };

    const handleFocusChange = () => {
      setIsScreenSharing(detectScreenSharing());
    };

    // Listen for visibility and focus changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);

    // Initial check
    setIsScreenSharing(detectScreenSharing());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, []);

  // Auto-enable presenter mode when screen sharing is detected
  useEffect(() => {
    if (isScreenSharing && !isPresenterMode) {
      setIsPresenterMode(true);
    }
  }, [isScreenSharing, isPresenterMode]);

  const togglePresenterMode = () => {
    setIsPresenterMode(!isPresenterMode);
  };

  const enablePresenterMode = () => {
    setIsPresenterMode(true);
  };

  const disablePresenterMode = () => {
    setIsPresenterMode(false);
  };

  return {
    isPresenterMode,
    isScreenSharing,
    togglePresenterMode,
    enablePresenterMode,
    disablePresenterMode
  };
}