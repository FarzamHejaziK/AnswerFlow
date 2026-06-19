"use client";

import { useEffect } from "react";

/**
 * Adds two cursor-driven effects:
 *  - a soft ambient glow that trails the pointer across the whole page
 *  - a per-card spotlight (sets --mx/--my on each .gcard) that lights up on hover
 */
export default function Spotlight() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const glow = document.querySelector<HTMLElement>(".cursor-glow");
    let raf = 0;
    let x = 0;
    let y = 0;

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (glow) {
          glow.style.setProperty("--gx", `${x}px`);
          glow.style.setProperty("--gy", `${y}px`);
        }
        const cards = document.querySelectorAll<HTMLElement>(".gcard");
        cards.forEach((card) => {
          const r = card.getBoundingClientRect();
          if (y < r.top - 60 || y > r.bottom + 60 || x < r.left - 60 || x > r.right + 60) return;
          card.style.setProperty("--mx", `${x - r.left}px`);
          card.style.setProperty("--my", `${y - r.top}px`);
        });
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="cursor-glow" aria-hidden />;
}
