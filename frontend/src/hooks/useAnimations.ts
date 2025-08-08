import { useCallback } from 'react';

export const useAnimations = () => {
  const animatePageEnter = useCallback((_selector = '.page-content') => {
    // This hook is outdated. The logic is now handled by Framer Motion props.
    // Returning a dummy object to avoid breaking components that use this hook.
    return {};
  }, []);

  const animateCards = useCallback((_selector = '.card') => {
    // This hook is outdated.
    return {};
  }, []);

  const animateSelection = useCallback((_element: HTMLElement) => {
    // This hook is outdated.
    return {};
  }, []);

  const animateButtonClick = useCallback((_element: HTMLElement) => {
    // This hook is outdated.
    return {};
  }, []);

  const animateProgress = useCallback((_element: HTMLElement, _progress: number) => {
    // This hook is outdated.
    return {};
  }, []);

  const animateSuccess = useCallback((_element: HTMLElement) => {
    // This hook is outdated.
    return {};
  }, []);

  const animateError = useCallback((_element: HTMLElement) => {
    // This hook is outdated.
    return {};
  }, []);

  const animateHoverIn = useCallback((_element: HTMLElement) => {
    // This hook is outdated.
    return {};
  }, []);

  const animateHoverOut = useCallback((_element: HTMLElement) => {
    // This hook is outdated.
    return {};
  }, []);

  return {
    animatePageEnter,
    animateCards,
    animateSelection,
    animateButtonClick,
    animateProgress,
    animateSuccess,
    animateError,
    animateHoverIn,
    animateHoverOut
  };
};

export const useCardAnimations = () => {
  const setupCardHovers = useCallback((_selector = '.card') => {
    // This hook is outdated.
  }, []);

  return {
    setupCardHovers
  };
};
