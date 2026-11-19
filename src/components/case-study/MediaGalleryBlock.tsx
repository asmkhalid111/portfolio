'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export interface MediaItem {
  id?: string;
  src: string;
  alt: string;
  caption?: string | null;
  badge?: string;
}

export interface MediaGalleryBlockProps {
  media: MediaItem[];
  title?: string;
}

export function MediaGalleryBlock({ media, title = 'Application Artifacts' }: MediaGalleryBlockProps) {
  const [rawIndex, setRawIndex] = useState<number>(0);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Clamp index purely during render (avoids cascading render effects)
  const activeIndex = media && media.length > 0 && rawIndex >= media.length ? 0 : rawIndex;

  // Handle keyboard arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!media || media.length <= 1) return;
    if (e.key === 'ArrowRight') {
      setRawIndex((prev) => (prev + 1) % media.length);
    } else if (e.key === 'ArrowLeft') {
      setRawIndex((prev) => (prev - 1 + media.length) % media.length);
    }
  };

  // Case 0: Empty Media Fallback (Completely omit when no visual artifacts exist)
  if (!media || media.length === 0) {
    return null;
  }

  const activeItem = media[activeIndex];
  const hasError = imageErrors[activeIndex];

  return (
    <section
      aria-labelledby="gallery-heading"
      className="space-y-4 my-8"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Interactive Project Media Gallery"
    >
      {/* Header and Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="gallery-heading" className="text-xs font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {title} ({media.length} {media.length === 1 ? 'Artifact' : 'Artifacts'})
          </h2>
          {activeItem.badge && (
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5 inline-block">
              {activeItem.badge}
            </span>
          )}
        </div>

        {/* Tab switchers if multiple items */}
        {media.length > 1 && (
          <div
            role="tablist"
            aria-label="Gallery tabs"
            className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl overflow-x-auto max-w-full"
          >
            {media.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id || idx}
                  role="tab"
                  id={`gallery-tab-${idx}`}
                  aria-selected={isSelected}
                  aria-controls={`gallery-panel-${idx}`}
                  onClick={() => setRawIndex(idx)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-60 mr-1.5">0{idx + 1}</span>
                  {item.alt.length > 24 ? `${item.alt.slice(0, 24)}…` : item.alt}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Frame Presentation */}
      <div
        id={`gallery-panel-${activeIndex}`}
        role="tabpanel"
        aria-labelledby={`gallery-tab-${activeIndex}`}
        className="group relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl"
      >
        {/* Window Chrome Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-amber-500/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-mono text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-md">
              {activeItem.alt}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-500">
              {activeIndex + 1} / {media.length}
            </span>
          </div>
        </div>

        {/* Image Display Surface */}
        <div className="relative min-h-[240px] sm:min-h-[420px] max-h-[640px] flex items-center justify-center bg-zinc-950 p-2 sm:p-6 overflow-hidden">
          {hasError ? (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <ImageIcon className="h-10 w-10 text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-300">Image artifact preview unavailable</p>
              <p className="text-xs text-zinc-500 mt-1">{activeItem.src}</p>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={activeItem.src}
              alt={activeItem.alt}
              loading="lazy"
              onError={() => setImageErrors((prev) => ({ ...prev, [activeIndex]: true }))}
              className="max-h-[580px] w-auto max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-300 group-hover:scale-[1.01]"
            />
          )}

          {/* Quick Prev/Next overlays for multi-image gallery */}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setRawIndex((prev) => (prev - 1 + media.length) % media.length)}
                aria-label="Previous artifact"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 transition opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setRawIndex((prev) => (prev + 1) % media.length)}
                aria-label="Next artifact"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-900/80 text-white hover:bg-zinc-800 transition opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {/* Caption Bar */}
        {activeItem.caption && (
          <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800/80 text-xs sm:text-sm text-zinc-300 flex items-center justify-between gap-4">
            <p className="leading-relaxed">
              <span className="font-semibold text-zinc-100 mr-2">Artifact Specimen:</span>
              {activeItem.caption}
            </p>
            <span className="shrink-0 flex items-center gap-1 font-mono text-[11px] text-zinc-500">
              <Eye className="h-3 w-3" aria-hidden="true" />
              Verified Artifact
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
