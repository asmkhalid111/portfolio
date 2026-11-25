"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "@/app/home.module.css";

export type ShowcaseProject = {
  slug: string;
  title: string;
  summary: string | null;
  poster: string;
  clip: string;
  alt: string;
};

const motionQuery = "(prefers-reduced-motion: reduce)";
const rotationDelay = 12_000;

function subscribeToVisibility(update: () => void) {
  document.addEventListener("visibilitychange", update);
  return () => document.removeEventListener("visibilitychange", update);
}

function subscribeToMotion(update: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", update);
  return () => query.removeEventListener("change", update);
}

export function ProjectShowcase({ projects }: { projects: ShowcaseProject[] }) {
  const [index, setIndex] = useState(0);
  const [rotationChoice, setRotationChoice] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [playChoice, setPlayChoice] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [readySlug, setReadySlug] = useState<string | null>(null);
  const [failedSlug, setFailedSlug] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rotationButton = useRef<HTMLButtonElement>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(motionQuery).matches,
    () => true,
  );
  const tabVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState !== "hidden",
    () => false,
  );
  const canRotate = projects.length > 1;
  const wantsRotation = rotationChoice ?? !reducedMotion;
  const rotating = canRotate && wantsRotation && visible && tabVisible && !hovered;
  const activeIndex = projects.length ? index % projects.length : 0;
  const active = projects[activeIndex];
  const wantsPlayback = playChoice ?? !reducedMotion;
  const canPlay = !!active && failedSlug !== active.slug;
  const showVideo = canPlay && wantsPlayback && visible;

  useEffect(() => {
    if (!stage.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.intersectionRatio >= 0.25;
        setVisible(inView);
        if (!inView) setReadySlug(null);
      },
      { threshold: 0.25 },
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => {
      setReadySlug(null);
      setIndex((current) => (current + 1) % projects.length);
    }, rotationDelay);
    return () => window.clearTimeout(timer);
  }, [activeIndex, projects.length, rotating]);

  if (!active) return null;

  function selectProject(position: number) {
    setRotationChoice(false);
    if (position === activeIndex) return;
    setReadySlug(null);
    setIndex(position);
  }

  function move(direction: number) {
    selectProject((activeIndex + direction + projects.length) % projects.length);
  }

  return (
    <section
      className={styles.showcase}
      aria-labelledby="selected-work"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocusCapture={(event) => {
        if (event.target !== rotationButton.current || rotationButton.current?.matches(":focus-visible")) {
          setRotationChoice(false);
        }
      }}
    >
      <div className={styles.showcaseTop}>
        <h2 id="selected-work">Selected work</h2>
        <div className={styles.showcaseMeta}>
          {canRotate && (
            <button
              ref={rotationButton}
              type="button"
              className={styles.rotationControl}
              aria-label={wantsRotation ? "Pause automatic project switching" : "Start automatic project switching"}
              onClick={() => setRotationChoice(!wantsRotation)}
            >
              {wantsRotation ? "Pause rotation" : "Start rotation"}
            </button>
          )}
          <span>{String(activeIndex + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span>
        </div>
      </div>

      <div className={styles.stage} ref={stage} data-count={projects.length}>
        {projects.map((project, position) => {
          const depth = (position - activeIndex + projects.length) % projects.length;
          return (
            <div
              className={styles.preview}
              data-depth={depth}
              key={project.slug}
              aria-hidden={depth !== 0}
            >
              <Image
                unoptimized
                src={project.poster}
                alt={project.alt}
                fill
                sizes="(min-width: 48rem) 50vw, 100vw"
                loading={position === 0 ? "eager" : "lazy"}
              />
              {depth === 0 && showVideo && (
                <video
                  key={project.slug}
                  className={styles.clip}
                  data-ready={readySlug === project.slug}
                  src={project.clip}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden="true"
                  onPlaying={() => setReadySlug(project.slug)}
                  onError={() => setFailedSlug(project.slug)}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.showcaseBottom}>
        <div className={styles.showcaseCaptions} aria-live={rotating ? "off" : "polite"} aria-atomic="true">
          {projects.map((project) => (
            <div key={project.slug} aria-hidden={project.slug !== active.slug}>
              <h3>{project.title}</h3>
              {project.summary && <p>{project.summary}</p>}
            </div>
          ))}
        </div>
        <Link href={"/projects/" + active.slug} prefetch={false} className={styles.textLink}>
          Read case study <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
        <div className={styles.controls}>
          <button
            type="button"
            disabled={!canPlay}
            aria-label={wantsPlayback ? "Pause project preview" : "Play project preview"}
            onClick={() => {
              setReadySlug(null);
              setPlayChoice(!wantsPlayback);
            }}
          >
            {wantsPlayback ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          </button>
          {canRotate && (
            <>
              <button type="button" aria-label="Previous project" onClick={() => move(-1)}>
                <ArrowLeft size={19} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Next project" onClick={() => move(1)}>
                <ArrowRight size={19} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
      {canRotate && (
        <div className={styles.projectPicker} role="group" aria-label="Choose a featured project">
          {projects.map((project, position) => (
            <button
              key={project.slug}
              type="button"
              aria-label={"Show " + project.title}
              aria-pressed={position === activeIndex}
              onClick={() => selectProject(position)}
            >
              {String(position + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
