"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ProjectPreview, motionQuery, subscribeToMotion, subscribeToVisibility, type PreviewMedia } from "./ProjectPreview";
import styles from "@/app/home.module.css";

type Slide = { id: string; title: string; slug: string; technologies: string[] | null; media: PreviewMedia };

export function ProjectShowcase({ slides }: { slides: Slide[] }) {
  const [selection, setSelection] = useState({ index: 0, direction: 1 });
  const [rotation, setRotation] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const reduced = useSyncExternalStore(subscribeToMotion, () => window.matchMedia(motionQuery).matches, () => true);
  const tabVisible = useSyncExternalStore(subscribeToVisibility, () => document.visibilityState !== "hidden", () => false);
  const count = slides.length;
  const index = selection.index % count;
  const active = slides[index];
  const wantsRotation = rotation ?? !reduced;
  const rotating = count > 1 && wantsRotation && visible && tabVisible && !hovered;

  useEffect(() => {
    if (!stage.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setSelection({ index: (index + 1) % count, direction: 1 }), 12000);
    return () => window.clearTimeout(timer);
  }, [index, count, rotating]);

  function move(direction: number) {
    setRotation(false);
    setSelection({ index: (index + direction + count) % count, direction });
  }

  return (
    <section className={styles.showcase} aria-labelledby="selected-work"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setHovered(false); }}
      onFocusCapture={(event) => { if (event.target.matches(":focus-visible")) setRotation(false); }}>
      <h2 id="selected-work" className="sr-only">Selected work</h2>
      <div ref={stage} className={styles.showcaseStage} data-layered={count > 1}
        onTouchStart={(event) => { const touch = event.touches[0]; swipeStart.current = { x: touch.clientX, y: touch.clientY }; }}
        onTouchEnd={(event) => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (!start || count < 2) return;
          const touch = event.changedTouches[0];
          const horizontal = touch.clientX - start.x;
          if (Math.abs(horizontal) > 45 && Math.abs(horizontal) > Math.abs(touch.clientY - start.y)) move(horizontal < 0 ? 1 : -1);
        }}>
        <div className={styles.slideTrack}>
          {slides.map((slide, position) => {
            const depth = ((position - index) * selection.direction + count) % count;
            return (
              <div key={slide.id} className={styles.slide} data-depth={depth} data-direction={selection.direction}
                aria-hidden={depth !== 0}>
                {slide.media.still && <Image className={styles.slideStill} unoptimized fill sizes="50vw" alt=""
                  src={slide.media.still.src} referrerPolicy="no-referrer" />}
                {depth === 0 && (
                  <ProjectPreview title={slide.title} technologies={slide.technologies ?? []} media={slide.media} priority />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.showcaseCaption} aria-live={rotating ? "off" : "polite"}>
        <div className={styles.showcaseTitles}>
          {slides.map(({ id, title }) => <h3 key={id} aria-hidden={id !== active.id}>{title}</h3>)}
        </div>
        <Link href={"/projects/" + active.slug} className={styles.textLink}>
          Read case study <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
      {count > 1 && (
        <div className={styles.slideControls} aria-label="Selected work controls">
          <button type="button" aria-label="Previous project" onClick={() => move(-1)}><ArrowLeft size={17} /></button>
          <span aria-label={`Project ${index + 1} of ${count}`}>{index + 1} / {count}</span>
          <button type="button" aria-label="Next project" onClick={() => move(1)}><ArrowRight size={17} /></button>
          <button type="button" aria-label={wantsRotation ? "Pause automatic project switching" : "Start automatic project switching"}
            onClick={() => setRotation((choice) => !(choice ?? !reduced))}>
            {wantsRotation ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      )}
    </section>
  );
}
