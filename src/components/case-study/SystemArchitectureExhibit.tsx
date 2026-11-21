import React from 'react';
import { Cpu, ExternalLink, ArrowDownUp, Check } from 'lucide-react';
import type { ArchitectureExhibit } from '@/lib/case-studies/architecture-exhibits';

export interface SystemArchitectureExhibitProps {
  exhibit: ArchitectureExhibit | null;
}

export function SystemArchitectureExhibit({ exhibit }: SystemArchitectureExhibitProps) {
  if (!exhibit) {
    return null;
  }

  // Find primary engine node and secondary/adapter nodes
  const primaryNode = exhibit.nodes.find((n) => n.variant === 'primary') || exhibit.nodes[0];
  const adapterNodes = exhibit.nodes.filter((n) => n.id !== primaryNode.id);

  // Helper to find connections involving a node
  const getConnection = (nodeId: string) => {
    return exhibit.connections.find(
      (c) =>
        (c.fromId === nodeId && c.toId === primaryNode.id) ||
        (c.toId === nodeId && c.fromId === primaryNode.id)
    );
  };

  return (
    <section
      id="system-architecture"
      aria-labelledby="architecture-exhibit-heading"
      className="space-y-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 scroll-mt-28"
    >
      {/* Top Provenance & Attribution Rail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          <span className="font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
            Source-Backed Engineering Exhibit
          </span>
        </div>
        <a
          href={exhibit.provenance.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:underline text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <span>View {exhibit.provenance.documentTitle}</span>
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>

      {/* Header Prose */}
      <div className="space-y-1.5">
        <h3
          id="architecture-exhibit-heading"
          className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          {exhibit.title}
        </h3>
        <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-3xl">
          {exhibit.summary}
        </p>
      </div>

      {/* Blueprint Canvas */}
      <figure className="m-0 rounded-2xl border border-zinc-200/90 bg-zinc-50/50 p-4 sm:p-8 dark:border-zinc-800 dark:bg-zinc-950/40 space-y-6 min-w-0 max-w-full">
        <figcaption className="sr-only">
          {exhibit.title}: Architectural relationship diagram between {primaryNode.title} and adapter subsystems.
        </figcaption>

        {/* 1. Adapters Row (Desktop: 3-column grid; Mobile: vertical stack) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 min-w-0">
          {adapterNodes.map((node) => {
            const conn = getConnection(node.id);
            return (
              <div
                key={node.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/80 transition-shadow hover:shadow-sm min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                      {node.title}
                    </h4>
                    <span className="shrink-0 rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {node.technology}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                    {node.role}
                  </p>

                  {node.path && (
                    <div className="min-w-0">
                      <code className="rounded bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 break-all">
                        {node.path}
                      </code>
                    </div>
                  )}

                  <ul className="space-y-1.5 pt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {node.responsibilities.map((resp, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-zinc-400 dark:text-zinc-500 select-none mt-0.5">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Node Footer: Connection & Status Note */}
                <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                  {conn && (
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 w-full justify-center">
                      <ArrowDownUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      <span>{conn.label}</span>
                    </div>
                  )}

                  {node.statusNote && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic leading-snug">
                      {node.statusNote}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Visual Directional Conduits (Desktop connector indicator) */}
        <div className="hidden md:flex items-center justify-around px-8 text-xs font-mono text-zinc-400 dark:text-zinc-500 select-none">
          {adapterNodes.map((node) => {
            const conn = getConnection(node.id);
            return (
              <div key={node.id} className="flex flex-col items-center gap-1">
                <div className="w-px h-5 bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-500" />
                <span className="text-[10px] tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                  {conn?.protocol || 'IPC'}
                </span>
                <div className="w-px h-5 bg-gradient-to-b from-zinc-400 to-zinc-500 dark:from-zinc-500 dark:to-zinc-300" />
              </div>
            );
          })}
        </div>

        {/* Mobile Separator (stacked connection bridge) */}
        <div className="md:hidden flex items-center justify-center gap-2 py-1 text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <ArrowDownUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Interconnect Boundary to Core Engine</span>
        </div>

        {/* 3. Foundational Core Engine Node */}
        <div className="rounded-xl border-2 border-zinc-900 bg-white p-4 sm:p-6 shadow-sm dark:border-zinc-100 dark:bg-zinc-900 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800 min-w-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <h4 className="text-base sm:text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  {primaryNode.title}
                </h4>
              </div>
              <p className="text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {primaryNode.role}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {primaryNode.path && (
                <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-700 dark:text-zinc-300 break-all">
                  {primaryNode.path}
                </code>
              )}
              <span className="rounded bg-zinc-900 dark:bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-bold text-white dark:text-zinc-900 shrink-0">
                {primaryNode.technology}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {primaryNode.responsibilities.map((resp, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{resp}</span>
              </div>
            ))}
          </div>

          {primaryNode.statusNote && (
            <div className="pt-4 mt-4 border-t border-zinc-150 dark:border-zinc-800 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
              <span>Verified Artifacts &amp; Coverage:</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">{primaryNode.statusNote}</span>
            </div>
          )}
        </div>

        {/* Footnote Attribution */}
        <div className="pt-2 text-center sm:text-left text-xs font-mono text-zinc-500 dark:text-zinc-400">
          <span>{exhibit.provenance.note}</span>
        </div>
      </figure>
    </section>
  );
}
