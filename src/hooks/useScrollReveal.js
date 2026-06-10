import { useEffect } from 'react';

/**
 * useScrollReveal — revela elementos com a classe `.reveal` conforme entram
 * na viewport (estilo scroll animation da Apple). Reexecuta o scan sempre
 * que `deps` mudam (ex.: conteúdo carregado de forma assíncrona).
 *
 * Uso: adicione className="reveal" (e opcionalmente reveal-delay-1..4) aos
 * elementos e chame useScrollReveal([algumaDependencia]) no componente.
 */
export default function useScrollReveal(deps = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal:not(.is-visible)'));
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
