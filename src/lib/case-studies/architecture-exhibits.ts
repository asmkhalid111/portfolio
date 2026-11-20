/**
 * Architecture Exhibit Data Models and Curated Pilot Registry
 * 
 * Generic node-and-connection topology suitable for multi-tier systems,
 * compiler pipelines, and client-server architectures.
 * 
 * NOTE: This is a manually curated manifest for showcase case studies.
 * It does NOT automatically synchronize when upstream READMEs change.
 * It is not a complete CMS, but a bounded, type-safe data registry.
 */

export interface ArchitectureNode {
  id: string;
  title: string;
  role: string;
  technology: string;
  path?: string;
  responsibilities: string[];
  statusNote?: string;
  variant?: 'primary' | 'secondary' | 'neutral';
}

export interface ArchitectureConnection {
  fromId: string;
  toId: string;
  protocol: string;
  label: string;
  description?: string;
  direction?: 'bidirectional' | 'to-target' | 'to-source';
}

export interface ArchitectureProvenance {
  documentTitle: string;
  documentUrl: string;
  branch: string;
  sectionAnchor: string;
  note: string;
}

export interface ArchitectureExhibit {
  id: string;
  title: string;
  summary: string;
  provenance: ArchitectureProvenance;
  nodes: ArchitectureNode[];
  connections: ArchitectureConnection[];
}

/**
 * Verified BornoMala Architecture Exhibit Configuration
 * 
 * Source facts verified against https://github.com/asmkhalid111/BornoMala/blob/master/README.md:
 * - Core engine: crates/bornomala-core/ (Pure Rust, C-ABI via include/bornomala.h)
 * - Windows native adapter: native/borno-tsf/ (C++ in-process COM, bornomala_tsf.dll)
 * - Linux native adapter: native/bornomala-fcitx5/ (C++ Fcitx 5 addon, bornomala.so, user-mode install)
 * - Desktop companion: src-tauri/ & src/ (Tauri v2 + React 18, Vite, TypeScript)
 */
const BORNOMALA_EXHIBIT: ArchitectureExhibit = {
  id: 'bornomala-system-architecture',
  title: 'Multi-Platform System Architecture & Interconnect Topology',
  summary:
    'A unified pure Rust core input engine exposing a stable C-ABI, shared across native Windows TSF, Linux Fcitx 5, and a Tauri v2 desktop companion application.',
  provenance: {
    documentTitle: 'README.md (Architecture Overview & Repository Structure)',
    documentUrl:
      'https://github.com/asmkhalid111/BornoMala/blob/master/README.md#architecture-overview',
    branch: 'master',
    sectionAnchor: '#architecture-overview',
    note: 'Authentic architecture derived from upstream README and repository tree structure.',
  },
  nodes: [
    {
      id: 'core-engine',
      title: 'bornomala-core',
      role: 'Shared Multi-Layout Input Engine',
      technology: 'Rust 2021',
      path: 'crates/bornomala-core/',
      variant: 'primary',
      responsibilities: [
        'Avro-compatible phonetic transliteration state machine',
        'National (BDS 1738:2018), Probhat, and Bijoy fixed keyboard layouts',
        'Unicode NFC canonical normalization and trie-based typo dictionary',
        'Exposes canonical C-ABI header (include/bornomala.h)',
      ],
      statusNote: 'Repository test suite includes 265 unit & layout tests across 12 targets',
    },
    {
      id: 'windows-tsf',
      title: 'Windows Native TSF IME',
      role: 'In-Process COM Text Input Processor',
      technology: 'C++ / Windows TSF',
      path: 'native/borno-tsf/',
      variant: 'secondary',
      responsibilities: [
        'ITfTextInputProcessorEx and ITfKeyEventSink COM server',
        'Floating candidate UI with GDI rendering and caret tracking',
        'Language bar mode controller (cycles layouts with F12 / F4)',
      ],
      statusNote: 'Produces bornomala_tsf.dll; verified via standalone test harness',
    },
    {
      id: 'linux-fcitx5',
      title: 'Linux Native Fcitx 5 Addon',
      role: 'Native Desktop Input Method Engine',
      technology: 'C++ / Fcitx 5 API',
      path: 'native/bornomala-fcitx5/',
      variant: 'secondary',
      responsibilities: [
        'Fcitx 5 InputMethodEngine addon implementation (bornomala.so)',
        'Preedit inline text formatting with underline styling',
        'Interactive floating candidate popup on Wayland / X11',
      ],
      statusNote: 'User-mode install via install.sh; historically validated under WSL2 / Ubuntu',
    },
    {
      id: 'desktop-sandbox',
      title: 'Desktop Companion & Sandbox',
      role: 'Cross-Platform Diagnostic & Configuration Interface',
      technology: 'Tauri v2 / React 18 / TypeScript',
      path: 'src-tauri/ & src/',
      variant: 'neutral',
      responsibilities: [
        'Interactive virtual keyboard visualizer and typing tester',
        'Real-time event logging and engine state inspector',
        'JSON-based user configuration persistence',
      ],
      statusNote: 'Built from source directly via npm run tauri dev (prebuilts are gitignored)',
    },
  ],
  connections: [
    {
      fromId: 'windows-tsf',
      toId: 'core-engine',
      protocol: 'C-ABI',
      label: 'C-ABI (bornomala.h)',
      description:
        'In-process COM DLL links statically to PIC-compiled Rust core through C header bindings',
      direction: 'bidirectional',
    },
    {
      fromId: 'linux-fcitx5',
      toId: 'core-engine',
      protocol: 'C-ABI',
      label: 'C-ABI (bornomala.h)',
      description:
        'Fcitx 5 addon loads PIC-compiled Rust core library via C-ABI exports',
      direction: 'bidirectional',
    },
    {
      fromId: 'desktop-sandbox',
      toId: 'core-engine',
      protocol: 'Rust FFI',
      label: 'Rust FFI / Tauri IPC',
      description:
        'Tauri desktop backend integrates bornomala-core directly via Cargo workspace dependency',
      direction: 'bidirectional',
    },
  ],
};

/**
 * Curated Exhibit Registry
 * 
 * Bounded visual pilot: Only BornoMala has an authorized exhibit.
 * Other projects return null until dedicated pilot approval.
 */
export function getArchitectureExhibit(slug: string): ArchitectureExhibit | null {
  if (slug === 'bornomala') {
    return BORNOMALA_EXHIBIT;
  }
  return null;
}
