import { useCallback } from 'react';
import { AnimationUtils } from '../utils/animations';

export const useAnimations = () => {
  const animatePageEnter = useCallback((selector = '.page-content') => {
    return AnimationUtils.pageEnter(selector);
  }, []);

  const animateCards = useCallback((selector = '.card') => {
    const elements = document.querySelectorAll(selector);
    return AnimationUtils.cardStagger(elements);
  }, []);

  const animateSelection = useCallback((element: HTMLElement) => {
    return AnimationUtils.selectionBounce(element);
  }, []);

  const animateButtonClick = useCallback((element: HTMLElement) => {
    return AnimationUtils.buttonPulse(element);
  }, []);

  const animateProgress = useCallback((element: HTMLElement, progress: number) => {
    return AnimationUtils.progressBar(element, progress);
  }, []);

  const animateSuccess = useCallback((element: HTMLElement) => {
    return AnimationUtils.successCheck(element);
  }, []);

  const animateError = useCallback((element: HTMLElement) => {
    return AnimationUtils.shakeError(element);
  }, []);

  const animateHoverIn = useCallback((element: HTMLElement) => {
    return AnimationUtils.hoverLift(element);
  }, []);

  const animateHoverOut = useCallback((element: HTMLElement) => {
    return AnimationUtils.hoverReset(element);
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
  const setupCardHovers = useCallback((selector = '.card') => {
    const cards = document.querySelectorAll(selector);
    cards.forEach((card) => {
      const element = card as HTMLElement;
      element.addEventListener('mouseenter', () => AnimationUtils.hoverLift(element));
      element.addEventListener('mouseleave', () => AnimationUtils.hoverReset(element));
      element.addEventListener('click', () => AnimationUtils.selectionBounce(element));
    });
  }, []);

  return {
    setupCardHovers
  };
};
