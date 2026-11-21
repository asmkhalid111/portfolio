import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  getArchitectureExhibit,
  type ArchitectureExhibit,
} from '@/lib/case-studies/architecture-exhibits';
import { SystemArchitectureExhibit } from '@/components/case-study/SystemArchitectureExhibit';

describe('Task 11D: Source-Backed Architecture Exhibit', () => {
  describe('getArchitectureExhibit Data Registry', () => {
    it('returns authentic BornoMala architecture exhibit with verified nodes and paths', () => {
      const exhibit = getArchitectureExhibit('bornomala');
      expect(exhibit).not.toBeNull();
      if (!exhibit) return;

      expect(exhibit.title).toBe(
        'Multi-Platform System Architecture & Interconnect Topology'
      );
      expect(exhibit.provenance.branch).toBe('master');
      expect(exhibit.provenance.sectionAnchor).toBe('#architecture-overview');
      expect(exhibit.provenance.documentUrl).toContain(
        'github.com/asmkhalid111/BornoMala/blob/master/README.md#architecture-overview'
      );

      // Verify authentic paths without ui/src-tauri error
      const nodePaths = exhibit.nodes.map((n) => n.path);
      expect(nodePaths).toContain('crates/bornomala-core/');
      expect(nodePaths).toContain('native/borno-tsf/');
      expect(nodePaths).toContain('native/bornomala-fcitx5/');
      expect(nodePaths).toContain('src-tauri/ & src/');
      expect(nodePaths).not.toContain('ui/src-tauri/');

      // Verify connection protocols
      const protocols = exhibit.connections.map((c) => c.protocol);
      expect(protocols).toContain('C-ABI');
      expect(protocols).toContain('Rust FFI');

      const labels = exhibit.connections.map((c) => c.label);
      expect(labels).toContain('C-ABI (bornomala.h)');
      expect(labels).toContain('Rust FFI / Tauri IPC');
    });

    it('returns null for projects without an authorized architecture pilot', () => {
      expect(getArchitectureExhibit('banglascript-compiler')).toBeNull();
      expect(getArchitectureExhibit('web-lan-chat')).toBeNull();
      expect(getArchitectureExhibit('unknown-project')).toBeNull();
      expect(getArchitectureExhibit('')).toBeNull();
    });
  });

  describe('SystemArchitectureExhibit Component Rendering', () => {
    it('returns null and renders zero DOM elements when exhibit is null', () => {
      const { container } = render(<SystemArchitectureExhibit exhibit={null} />);
      expect(container.firstChild).toBeNull();
      expect(screen.queryByRole('figure')).toBeNull();
      expect(screen.queryByText(/Source-Backed Engineering Exhibit/i)).toBeNull();
    });

    it('renders authentic architecture blueprint, nodes, and interface connectors', () => {
      const exhibit = getArchitectureExhibit('bornomala');
      expect(exhibit).not.toBeNull();

      render(<SystemArchitectureExhibit exhibit={exhibit} />);

      // Section and heading
      const heading = screen.getByRole('heading', {
        level: 3,
        name: 'Multi-Platform System Architecture & Interconnect Topology',
      });
      expect(heading).toBeDefined();
      expect(heading.id).toBe('architecture-exhibit-heading');

      // Top overline & Provenance link
      expect(
        screen.getByText('Source-Backed Engineering Exhibit')
      ).toBeDefined();
      const provLink = screen.getByRole('link', {
        name: /View README.md \(Architecture Overview & Repository Structure\)/i,
      });
      expect(provLink.getAttribute('href')).toBe(
        'https://github.com/asmkhalid111/BornoMala/blob/master/README.md#architecture-overview'
      );

      // Verify core engine node
      expect(screen.getByText('bornomala-core')).toBeDefined();
      expect(screen.getByText('crates/bornomala-core/')).toBeDefined();
      expect(screen.getByText('Rust 2021')).toBeDefined();
      expect(
        screen.getByText(
          'Avro-compatible phonetic transliteration state machine'
        )
      ).toBeDefined();

      // Verify native adapter nodes
      expect(screen.getByText('Windows Native TSF IME')).toBeDefined();
      expect(screen.getByText('native/borno-tsf/')).toBeDefined();
      expect(screen.getByText('Linux Native Fcitx 5 Addon')).toBeDefined();
      expect(screen.getByText('native/bornomala-fcitx5/')).toBeDefined();
      expect(screen.getByText('Desktop Companion & Sandbox')).toBeDefined();
      expect(screen.getByText('src-tauri/ & src/')).toBeDefined();

      // Verify connection chips
      const cabiChips = screen.getAllByText('C-ABI (bornomala.h)');
      expect(cabiChips.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Rust FFI / Tauri IPC')).toBeDefined();

      // Verify realistic historical status notes
      expect(
        screen.getByText(/265 unit & layout tests across 12 targets/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Produces bornomala_tsf.dll/i)
      ).toBeDefined();
      expect(
        screen.getByText(/historically validated under WSL2 \/ Ubuntu/i)
      ).toBeDefined();
    });

    it('renders a generic custom exhibit topology without relying on slug-specific JSX', () => {
      const customExhibit: ArchitectureExhibit = {
        id: 'generic-test-arch',
        title: 'Generic Pipeline Architecture',
        summary: 'A test generic data pipeline.',
        provenance: {
          documentTitle: 'SPEC.md',
          documentUrl: 'https://example.com/spec',
          branch: 'main',
          sectionAnchor: '#arch',
          note: 'Test note',
        },
        nodes: [
          {
            id: 'worker',
            title: 'Task Worker',
            role: 'Async Job Processor',
            technology: 'Go',
            path: 'cmd/worker/',
            variant: 'primary',
            responsibilities: ['Process incoming job queue', 'Commit results'],
          },
          {
            id: 'api',
            title: 'API Gateway',
            role: 'HTTP Request Router',
            technology: 'TypeScript',
            path: 'src/api/',
            variant: 'secondary',
            responsibilities: ['Validate input', 'Dispatch job to queue'],
          },
        ],
        connections: [
          {
            fromId: 'api',
            toId: 'worker',
            protocol: 'gRPC',
            label: 'gRPC stream',
          },
        ],
      };

      render(<SystemArchitectureExhibit exhibit={customExhibit} />);

      expect(screen.getByText('Generic Pipeline Architecture')).toBeDefined();
      expect(screen.getByText('Task Worker')).toBeDefined();
      expect(screen.getByText('API Gateway')).toBeDefined();
      expect(screen.getByText('gRPC stream')).toBeDefined();
    });
  });
});
