"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "@/app/home.module.css";

export type PreviewAsset = { src: string; alt: string };
export type PreviewMedia = {
  still?: PreviewAsset;
  animation?: PreviewAsset & { kind: "video" | "gif" };
};

export const motionQuery = "(prefers-reduced-motion: reduce)";

export function subscribeToMotion(update: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
}

export function subscribeToVisibility(update: () => void) {
  document.addEventListener("visibilitychange", update);
  return () => document.removeEventListener("visibilitychange", update);
}

export function ProjectPreview({ media, title, technologies, priority = false }: {
  media: PreviewMedia;
  title: string;
  technologies: string[];
  priority?: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const [playingSource, setPlayingSource] = useState<string>();
  const [failedAnimation, setFailedAnimation] = useState<string>();
  const [failedStill, setFailedStill] = useState<string>();
  const reducedMotion = useSyncExternalStore(subscribeToMotion, () => window.matchMedia(motionQuery).matches, () => true);
  const tabVisible = useSyncExternalStore(subscribeToVisibility, () => document.visibilityState !== "hidden", () => false);
  const animation = media.animation?.src === failedAnimation ? undefined : media.animation;
  const still = media.still?.src === failedStill ? undefined : media.still;
  const wantsPlayback = playChoice ?? !reducedMotion;
  const shouldPlay = Boolean(animation && tabVisible && (
    priority ? wantsPlayback && (inView || playChoice === true) : hovered && !reducedMotion
  ));
  const animationVisible = shouldPlay && playingSource === animation?.src;

  useEffect(() => {
    if (!priority || !animation || !frame.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.intersectionRatio >= 0.35;
      setInView(visible);
      if (!visible) {
        setPlayChoice((choice) => choice === true ? null : choice);
        setPlayingSource(undefined);
      }
    }, { threshold: 0.35 });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [animation, priority]);

  useEffect(() => {
    if (!shouldPlay || !video.current) return;
    const element = video.current;
    void element.play().catch(() => {
      if (element.isConnected && !element.error) setPlayChoice(false);
    });
  }, [shouldPlay]);

  const sizes = "(min-width: 64rem) 56vw, (min-width: 48rem) 50vw, 100vw";

  return (
    <div ref={frame} className={styles.media}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={() => { setHovered(false); if (!priority) setPlayingSource(undefined); }}>
      <div className={styles.mediaFrame}>
        {still ? (
          <Image unoptimized fill sizes={sizes} loading={priority ? "eager" : "lazy"}
            src={still.src} alt={still.alt} referrerPolicy="no-referrer" onError={() => setFailedStill(still.src)} />
        ) : (
          <div className={styles.cover} aria-hidden="true">
            {priority && <span>{title}</span>}
            {technologies.length > 0 && <small>{technologies.slice(0, 3).join(" / ")}</small>}
          </div>
        )}
        {shouldPlay && animation?.kind === "video" && (
          <video key={animation.src} ref={video} className={styles.clip} data-playing={animationVisible}
            src={animation.src} muted loop playsInline aria-hidden={Boolean(still)} aria-label={animation.alt}
            onPlaying={() => setPlayingSource(animation.src)} onError={() => setFailedAnimation(animation.src)} />
        )}
        {shouldPlay && animation?.kind === "gif" && (
          <Image key={animation.src} unoptimized fill sizes={sizes} className={styles.clip} data-playing={animationVisible}
            src={animation.src} alt={still ? "" : animation.alt} referrerPolicy="no-referrer"
            onLoad={() => setPlayingSource(animation.src)} onError={() => setFailedAnimation(animation.src)} />
        )}
      </div>
      {priority && animation && (
        <button type="button" className={styles.playback}
          aria-label={wantsPlayback ? "Pause project preview" : "Play project preview"}
          onClick={() => { setPlayingSource(undefined); setPlayChoice(!wantsPlayback); }}>
          {wantsPlayback ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}
