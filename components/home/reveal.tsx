"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Sección que aparece al entrar en pantalla. El contenido es visible por defecto:
// solo se oculta (.armed) una vez en el cliente y si hay IntersectionObserver y
// no se pidió reducir el movimiento.
export function Reveal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    el.classList.add("armed");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className={className ? `reveal ${className}` : "reveal"}>
      {children}
    </section>
  );
}
