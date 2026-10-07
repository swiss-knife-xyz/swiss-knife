export interface FileNode {
  id: string;
  name: string;
  path: string;
  children?: FileNode[];
  content?: string;
  isTarget?: boolean;
}

export interface DiffStats {
  linesAdded: number;
  linesRemoved: number;
}

export interface TabData {
  id: string;
  name: string;
  path: string;
  content: string;
  isPinned?: boolean;
  isTarget?: boolean;
  diffStats?: DiffStats;
}

export interface DiffFileData {
  oldCode: string;
  oldExists?: boolean;
  newExists?: boolean;
  diffCode: string; // with +→ and -→ markers
  newCode: string;
  changesCount: number;
  linesAdded: number;
  linesRemoved: number;
}

export interface SourceCodeExplorerProps {
  sourceCode: Record<string, string>;
  targetFileName?: string;
  contractName?: string;
  /** When provided, enables diff mode with Old/Diff/New view switching */
  diffData?: Record<string, DiffFileData>;
  /** Initial height in pixels (default: 400) */
  initialHeight?: number;
  /** Optional viewport cap for the editor pane, excluding outer toolbars. */
  maxHeight?: string;
  /** Whether the parent container is in fullscreen mode */
  isFullscreen?: boolean;
}

// Search types
export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchResult {
  filePath: string;
  fileName: string;
  matches: SearchMatch[];
}

export interface SearchOptions {
  caseSensitive: boolean;
  regex: boolean;
}
