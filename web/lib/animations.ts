import gsap from 'gsap';

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const animatePageEnter = () => {
  const reduce = prefersReducedMotion();
  const el = typeof document !== 'undefined' ? document.querySelector('main') : null;
  if (!el) return;
  // fromTo (not from): React Strict Mode remounts can leave gsap.from stuck mid-opacity.
  return gsap.fromTo(
    el,
    { opacity: 0 },
    {
      opacity: 1,
      duration: reduce ? 0.15 : 0.45,
      ease: reduce ? 'power1.out' : 'power2.out',
      overwrite: true,
      clearProps: 'opacity',
    },
  );
};

export const animateCardGrid = (selector: string, delay = 0) => {
  const reduce = prefersReducedMotion();
  const els = typeof document !== 'undefined' ? document.querySelectorAll(selector) : [];
  if (!els.length) return;
  return gsap.fromTo(
    els,
    { opacity: 0 },
    {
      opacity: 1,
      duration: reduce ? 0.15 : 0.45,
      stagger: reduce ? 0 : 0.02,
      ease: reduce ? 'power1.out' : 'power2.out',
      delay: reduce ? 0 : delay,
      overwrite: true,
      clearProps: 'opacity',
    },
  );
};

export function createCardHover(el: HTMLElement) {
  const onEnter = () => {
    el.style.borderColor = '#eaeaea';
    el.style.backgroundColor = '#161616';
  };
  const onLeave = () => {
    el.style.borderColor = '';
    el.style.backgroundColor = '';
  };
  el.addEventListener('mouseenter', onEnter);
  el.addEventListener('mouseleave', onLeave);
  return () => {
    el.removeEventListener('mouseenter', onEnter);
    el.removeEventListener('mouseleave', onLeave);
  };
}

export const animatePlayButton = (el: HTMLElement, playing: boolean) => {
  const reduce = prefersReducedMotion();
  return gsap.to(el, {
    opacity: playing ? 1 : 0.85,
    duration: reduce ? 0.12 : 0.2,
    ease: 'power2.out',
  });
};

export const animateFollowButton = (el: HTMLElement, following: boolean) =>
  gsap.to(el, {
    backgroundColor: following ? '#e61919' : 'transparent',
    borderColor: following ? '#e61919' : '#2a2a2a',
    color: '#eaeaea',
    duration: prefersReducedMotion() ? 0.12 : 0.22,
    ease: 'power2.out',
  });

export const animateModalOpen = (el: HTMLElement) => {
  const reduce = prefersReducedMotion();
  return gsap.fromTo(
    el,
    { opacity: 0 },
    { opacity: 1, duration: reduce ? 0.12 : 0.22, ease: 'power2.out' },
  );
};

export const animateModalClose = (el: HTMLElement, onComplete?: () => void) =>
  gsap.to(el, {
    opacity: 0,
    duration: prefersReducedMotion() ? 0.1 : 0.18,
    ease: 'power2.in',
    onComplete,
  });
