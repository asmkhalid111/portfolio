"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function HomeSection({ id, className, children }: {
  id: string;
  className: string;
  children: ReactNode;
}) {
  const section = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!section.current || typeof IntersectionObserver === "undefined") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) return;

    const observer = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        if (target instanceof HTMLElement && !preference.matches) {
          target.dataset.homeReveal = "visible";
        }
        observer.unobserve(target);
      }
    }, { threshold: 0.08 });

    section.current.querySelectorAll("[data-home-reveal]").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={section} id={id} className={className} aria-labelledby={id + "-heading"}>
      {children}
    </section>
  );
}
