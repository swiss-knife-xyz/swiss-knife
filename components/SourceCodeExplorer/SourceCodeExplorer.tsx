"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Box, HStack, Text, VStack, IconButton, Tooltip, Badge, Icon } from "@chakra-ui/react";
import { Editor, type OnMount } from "@monaco-editor/react";
import { Search, Files } from "lucide-react";
import { FileExplorerTree } from "./FileExplorerTree";
import { CodeEditorTabs } from "./CodeEditorTabs";
import { SearchPanel } from "./SearchPanel";
import { buildFileTree, findTargetFile, getLanguageForFile, detectLanguageFromContent } from "./utils";
import { FileNode, TabData, SourceCodeExplorerProps, SearchOptions } from "./types";
import TabsSelector from "@/components/Tabs/TabsSelector";
import { CopyToClipboard } from "@/components/CopyToClipboard";

// Monaco editor instance type from OnMount callback
type EditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

const DiffViewOptions = ["Old", "Diff", "New"];

// Process diff code to extract clean code and line decorations
const processDiffCode = (
  diffCode: string
): { cleanCode: string; lineTypes: Map<number, "added" | "removed"> } => {
  const lines = diffCode.split("\n");
  const lineTypes = new Map<number, "added" | "removed">();
  const cleanLines: string[] = [];

  lines.forEach((line) => {
    if (line.startsWith("+→")) {
      lineTypes.set(cleanLines.length + 1, "added");
      cleanLines.push(line.slice(2));
    } else if (line.startsWith("-→")) {
      lineTypes.set(cleanLines.length + 1, "removed");
      cleanLines.push(line.slice(2));
    } else {
      cleanLines.push(line);
    }
  });

  return { cleanCode: cleanLines.join("\n"), lineTypes };
};

// Inject diff highlighting styles for Monaco decorations
const useDiffStyles = () => {
  useEffect(() => {
    const styleId = "monaco-diff-styles";
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .diff-line-added {
        background: rgba(40, 167, 69, 0.3) !important;
        width: 100% !important;
      }
      .diff-line-removed {
        background: rgba(220, 53, 69, 0.3) !important;
        width: 100% !important;
      }
      .search-highlight {
        background: rgba(234, 179, 8, 0.35) !important;
        border: 1px solid rgba(234, 179, 8, 0.6);
        border-radius: 2px;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const s = document.getElementById(styleId);
      if (s) s.remove();
    };
  }, []);
};

export function SourceCodeExplorer({
  sourceCode,
  targetFileName,
  contractName,
  diffData,
  initialHeight = 400,
  isFullscreen = false,
}: SourceCodeExplorerProps) {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [sidebarTab, setSidebarTab] = useState<"explorer" | "search">("explorer");
  const [height, setHeight] = useState(initialHeight);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [isResizing, setIsResizing] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [diffViewMode, setDiffViewMode] = useState(1); // 0=Old, 1=Diff, 2=New
  // Track which sourceCode we've initialized for
  const initializedForRef = useRef<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({ caseSensitive: false, regex: false });
  // Monaco editor instance ref
  const editorRef = useRef<EditorInstance | null>(null);
  // Monaco namespace ref (for creating Range objects)
  const monacoRef = useRef<MonacoInstance | null>(null);
  // Pending line to scroll to after file opens
  const pendingLineRef = useRef<number | null>(null);
  // Container ref for resize calculations
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Search highlight decorations collection ref
  const searchDecorationsRef = useRef<ReturnType<EditorInstance["createDecorationsCollection"]> | null>(null);

  const isDiffMode = !!diffData;

  // Inject diff styles (always called to satisfy React hooks rules; harmless when not in diff mode)
  useDiffStyles();

  // Build map of changed file paths with their diff stats for the file tree indicators
  const changedFiles = useMemo(() => {
    if (!diffData) return undefined;
    const changed = new Map<string, { linesAdded: number; linesRemoved: number }>();
    for (const [path, data] of Object.entries(diffData)) {
      if (data.changesCount > 0) {
        changed.set(path, { linesAdded: data.linesAdded, linesRemoved: data.linesRemoved });
      }
    }
    return changed;
  }, [diffData]);

  // Get diff data for the active file
  const activeFileDiff = useMemo(() => {
    if (!diffData || !activeTabId) return null;
    return diffData[activeTabId] || null;
  }, [diffData, activeTabId]);

  // Process diff code for the active file
  const processedDiff = useMemo(() => {
    if (!activeFileDiff) return null;
    return processDiffCode(activeFileDiff.diffCode);
  }, [activeFileDiff]);

  // Build file tree from source code
  const fileTree = useMemo(() => {
    if (!sourceCode || Object.keys(sourceCode).length === 0) return [];
    const target = targetFileName || findTargetFile(sourceCode, contractName);
    const targetName = target?.split("/").pop();
    return buildFileTree(sourceCode, targetName);
  }, [sourceCode, targetFileName, contractName]);

  // Find target file path
  const targetPath = useMemo(() => {
    return targetFileName || findTargetFile(sourceCode, contractName);
  }, [sourceCode, targetFileName, contractName]);

  // Initialize tabs
  // In diff mode: auto-open all files with changes as pinned tabs
  // In normal mode: open the target file as a pinned tab
  useEffect(() => {
    if (!sourceCode || Object.keys(sourceCode).length === 0) {
      return;
    }

    // Create a key to identify this sourceCode (using first few file paths)
    const sourceKey = Object.keys(sourceCode).slice(0, 3).join(",");

    // Skip if already initialized for this sourceCode
    if (initializedForRef.current === sourceKey) {
      return;
    }

    if (isDiffMode && diffData) {
      // In diff mode, open all files with changes as pinned tabs
      const changedTabs: TabData[] = [];
      let firstChangedPath: string | null = null;

      for (const [path, data] of Object.entries(diffData)) {
        if (data.changesCount > 0 && sourceCode[path]) {
          if (!firstChangedPath) firstChangedPath = path;
          const fileName = path.split("/").pop() || path;
          changedTabs.push({
            id: path,
            name: fileName,
            path,
            content: sourceCode[path],
            isPinned: true,
            isTarget: false,
            diffStats: { linesAdded: data.linesAdded, linesRemoved: data.linesRemoved },
          });
        }
      }

      if (changedTabs.length > 0) {
        setTabs(changedTabs);
        setActiveTabId(firstChangedPath!);
      } else {
        // No changes, fallback to first file
        const filePath = Object.keys(sourceCode)[0];
        const fileName = filePath.split("/").pop() || filePath;
        setTabs([{ id: filePath, name: fileName, path: filePath, content: sourceCode[filePath], isPinned: true, isTarget: false }]);
        setActiveTabId(filePath);
      }
    } else {
      // Normal mode: open target file
      let filePath: string;
      let isTarget = false;

      if (targetPath && sourceCode[targetPath]) {
        filePath = targetPath;
        isTarget = true;
      } else {
        filePath = Object.keys(sourceCode)[0];
      }

      const fileName = filePath.split("/").pop() || filePath;
      const initialTab: TabData = {
        id: filePath,
        name: fileName,
        path: filePath,
        content: sourceCode[filePath],
        isPinned: true,
        isTarget,
      };

      setTabs([initialTab]);
      setActiveTabId(filePath);
    }

    initializedForRef.current = sourceKey;
  }, [sourceCode, targetPath, isDiffMode, diffData]);

  // Open or switch to a file
  const handleFileSelect = useCallback((path: string, content: string) => {
    setTabs((prevTabs) => {
      // Check if tab already exists
      const existingTab = prevTabs.find((t) => t.path === path);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return prevTabs;
      }

      // Create new tab
      const fileName = path.split("/").pop() || path;
      const newTab: TabData = {
        id: path,
        name: fileName,
        path,
        content,
        isPinned: false,
        isTarget: false,
      };

      setActiveTabId(path);
      return [...prevTabs, newTab];
    });
  }, []);

  // Close a tab
  const handleTabClose = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const tabIndex = prevTabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return prevTabs;

      const tab = prevTabs[tabIndex];
      if (tab.isPinned) return prevTabs; // Can't close pinned tab

      const newTabs = prevTabs.filter((t) => t.id !== tabId);

      // If closing active tab, switch to adjacent tab
      if (tabId === activeTabId && newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      }

      return newTabs;
    });
  }, [activeTabId]);

  // Get active tab content
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId);
  }, [tabs, activeTabId]);

  // Compute the displayed content based on diff view mode
  const displayedContent = useMemo(() => {
    if (!activeTab) return "";
    if (!activeFileDiff) return activeTab.content;
    if (diffViewMode === 0) return activeFileDiff.oldCode;
    if (diffViewMode === 1) return processedDiff?.cleanCode || activeTab.content;
    return activeFileDiff.newCode;
  }, [activeTab, activeFileDiff, diffViewMode, processedDiff]);

  // Get language for current file (falls back to content-based detection)
  const language = useMemo(() => {
    if (!activeTab) return "sol";
    const lang = getLanguageForFile(activeTab.name);
    if (lang === "plaintext" && activeTab.content) {
      return detectLanguageFromContent(activeTab.content);
    }
    return lang;
  }, [activeTab]);

  // Compute search highlight decorations for the current editor content
  const applySearchHighlights = useCallback((editor: EditorInstance, monaco: MonacoInstance) => {
    // Clear previous search decorations
    if (searchDecorationsRef.current) {
      searchDecorationsRef.current.clear();
      searchDecorationsRef.current = null;
    }

    if (!searchQuery || !displayedContent) return;

    try {
      let regex: RegExp;
      const flags = searchOptions.caseSensitive ? "g" : "gi";
      if (searchOptions.regex) {
        regex = new RegExp(searchQuery, flags);
      } else {
        regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
      }

      const decorations: Array<{
        range: InstanceType<typeof monaco.Range>;
        options: { inlineClassName: string; minimap: { color: string; position: number } };
      }> = [];

      const lines = displayedContent.split("\n");
      for (let i = 0; i < lines.length; i++) {
        let match: RegExpExecArray | null;
        regex.lastIndex = 0;
        while ((match = regex.exec(lines[i])) !== null) {
          const startCol = match.index + 1;
          const endCol = match.index + match[0].length + 1;
          decorations.push({
            range: new monaco.Range(i + 1, startCol, i + 1, endCol),
            options: {
              inlineClassName: "search-highlight",
              minimap: {
                color: "#eab30890",
                position: 1,
              },
            },
          });
          if (match[0].length === 0) break;
        }
      }

      if (decorations.length > 0) {
        searchDecorationsRef.current = editor.createDecorationsCollection(decorations);
      }
    } catch {
      // Invalid regex - ignore
    }
  }, [searchQuery, searchOptions, displayedContent]);

  // Patch Solidity language to support single-quote strings
  const patchSolidityLanguage = useCallback((monaco: MonacoInstance) => {
    monaco.languages.setMonarchTokensProvider("sol", {
      defaultToken: "",
      tokenPostfix: ".sol",
      brackets: [
        { token: "delimiter.curly", open: "{", close: "}" },
        { token: "delimiter.parenthesis", open: "(", close: ")" },
        { token: "delimiter.square", open: "[", close: "]" },
        { token: "delimiter.angle", open: "<", close: ">" },
      ],
      keywords: [
        "pragma", "solidity", "contract", "library", "using", "struct",
        "function", "modifier", "constructor", "address", "string", "bool",
        "int", "uint", "byte", "bytes", "fixed", "ufixed",
        "int8", "int16", "int24", "int32", "int40", "int48", "int56", "int64",
        "int72", "int80", "int88", "int96", "int104", "int112", "int120", "int128",
        "int136", "int144", "int152", "int160", "int168", "int176", "int184", "int192",
        "int200", "int208", "int216", "int224", "int232", "int240", "int248", "int256",
        "uint8", "uint16", "uint24", "uint32", "uint40", "uint48", "uint56", "uint64",
        "uint72", "uint80", "uint88", "uint96", "uint104", "uint112", "uint120", "uint128",
        "uint136", "uint144", "uint152", "uint160", "uint168", "uint176", "uint184", "uint192",
        "uint200", "uint208", "uint216", "uint224", "uint232", "uint240", "uint248", "uint256",
        "bytes1", "bytes2", "bytes3", "bytes4", "bytes5", "bytes6", "bytes7", "bytes8",
        "bytes9", "bytes10", "bytes11", "bytes12", "bytes13", "bytes14", "bytes15", "bytes16",
        "bytes17", "bytes18", "bytes19", "bytes20", "bytes21", "bytes22", "bytes23", "bytes24",
        "bytes25", "bytes26", "bytes27", "bytes28", "bytes29", "bytes30", "bytes31", "bytes32",
        "event", "enum", "let", "mapping", "private", "public", "external", "internal",
        "inherited", "payable", "nonpayable", "view", "pure", "virtual", "override",
        "abstract", "interface", "true", "false", "var", "import", "constant", "immutable",
        "if", "else", "for", "while", "do", "break", "continue", "throw",
        "returns", "return", "suicide", "selfdestruct", "new", "is", "this", "super",
        "emit", "require", "assert", "revert", "memory", "storage", "calldata",
        "delete", "unchecked", "try", "catch", "assembly", "type", "error",
        "receive", "fallback",
      ],
      operators: [
        "=", ">", "<", "!", "~", "?", ":", "==", "<=", ">=", "!=",
        "&&", "||", "++", "--", "+", "-", "*", "/", "&", "|", "^", "%",
        "<<", ">>", ">>>", "+=", "-=", "*=", "/=", "&=", "|=", "^=",
        "%=", "<<=", ">>=", ">>>=",
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      integersuffix: /(ll|LL|u|U|l|L)?(ll|LL|u|U|l|L)?/,
      floatsuffix: /[fFlL]?/,
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, { cases: { "@keywords": { token: "keyword.$0" }, "@default": "identifier" } }],
          { include: "@whitespace" },
          [/\[\[.*\]\]/, "annotation"],
          [/^\s*#\w+/, "keyword"],
          [/int\d*/, "keyword"],
          [/[{}()\[\]]/, "@brackets"],
          [/[<>](?!@symbols)/, "@brackets"],
          [/@symbols/, { cases: { "@operators": "delimiter", "@default": "" } }],
          [/\d*\d+[eE]([\-+]?\d+)?(@floatsuffix)/, "number.float"],
          [/\d*\.\d+([eE][\-+]?\d+)?(@floatsuffix)/, "number.float"],
          [/0[xX][0-9a-fA-F']*[0-9a-fA-F](@integersuffix)/, "number.hex"],
          [/0[0-7']*[0-7](@integersuffix)/, "number.octal"],
          [/0[bB][0-1']*[0-1](@integersuffix)/, "number.binary"],
          [/\d[\d']*\d(@integersuffix)/, "number"],
          [/\d(@integersuffix)/, "number"],
          [/[;,.]/, "delimiter"],
          // Double-quoted strings
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string_double"],
          // Single-quoted strings (Solidity supports both)
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/'/, "string", "@string_single"],
        ],
        whitespace: [
          [/[ \t\r\n]+/, ""],
          [/\/\*\*(?!\/)/, "comment.doc", "@doccomment"],
          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"],
        ],
        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"],
        ],
        doccomment: [
          [/[^\/*]+/, "comment.doc"],
          [/\*\//, "comment.doc", "@pop"],
          [/[\/*]/, "comment.doc"],
        ],
        string_double: [
          [/[^\\"]+/, "string"],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],
          [/"/, "string", "@pop"],
        ],
        string_single: [
          [/[^\\']+/, "string"],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],
          [/'/, "string", "@pop"],
        ],
      },
    });
  }, []);

  // Handle Monaco editor mount (with optional diff decorations)
  const handleEditorMount = useCallback(
    (editor: EditorInstance, monaco: MonacoInstance) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Patch Solidity single-quote string support
      patchSolidityLanguage(monaco);

      // Check if there's a pending line to scroll to
      if (pendingLineRef.current !== null) {
        editor.revealLineInCenter(pendingLineRef.current);
        editor.setPosition({ lineNumber: pendingLineRef.current, column: 1 });
        pendingLineRef.current = null;
      }

      // Apply diff decorations when in diff view mode
      if (isDiffMode && diffViewMode === 1 && processedDiff) {
        const decorations: Array<{
          range: InstanceType<typeof monaco.Range>;
          options: {
            isWholeLine: boolean;
            className: string;
            minimap: { color: string; position: number };
          };
        }> = [];

        processedDiff.lineTypes.forEach((type, lineNumber) => {
          decorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, 1),
            options: {
              isWholeLine: true,
              className:
                type === "added" ? "diff-line-added" : "diff-line-removed",
              minimap: {
                color: type === "added" ? "#2ea04370" : "#dc354570",
                position: 1, // MinimapPosition.Inline
              },
            },
          });
        });

        editor.createDecorationsCollection(decorations);
      }

      // Apply search highlights on mount
      applySearchHighlights(editor, monaco);
    },
    [isDiffMode, diffViewMode, processedDiff, applySearchHighlights, patchSolidityLanguage]
  );

  // Scroll to line when active tab changes and we have a pending line
  useEffect(() => {
    if (editorRef.current && pendingLineRef.current !== null) {
      // Small delay to ensure content is loaded
      setTimeout(() => {
        if (editorRef.current && pendingLineRef.current !== null) {
          editorRef.current.revealLineInCenter(pendingLineRef.current);
          editorRef.current.setPosition({ lineNumber: pendingLineRef.current, column: 1 });
          pendingLineRef.current = null;
        }
      }, 50);
    }
  }, [activeTabId]);

  // Handle search query change from SearchPanel
  const handleSearchQueryChange = useCallback((query: string, options: SearchOptions) => {
    setSearchQuery(query);
    setSearchOptions(options);
  }, []);

  // Handle sidebar tab switch - clear search highlights when leaving search
  const handleSidebarTabChange = useCallback((tab: "explorer" | "search") => {
    setSidebarTab(tab);
    if (tab !== "search") {
      setSearchQuery("");
    }
  }, []);

  // Apply search highlight decorations when query/content changes
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    applySearchHighlights(editor, monaco);
  }, [applySearchHighlights, activeTabId]);

  // Handle vertical resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerTop = containerRef.current.getBoundingClientRect().top;
      const newHeight = Math.max(200, Math.min(1200, e.clientY - containerTop));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Handle horizontal sidebar resize
  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerLeft = containerRef.current.getBoundingClientRect().left;
      const newWidth = Math.max(150, Math.min(500, e.clientX - containerLeft));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  // Handle search result click - open file and scroll to line
  const handleSearchResultClick = useCallback((path: string, content: string, lineNumber: number) => {
    // Store the line number to scroll to after file opens
    pendingLineRef.current = lineNumber;

    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((t) => t.path === path);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        // If tab already active, scroll immediately
        if (existingTab.id === activeTabId && editorRef.current) {
          editorRef.current.revealLineInCenter(lineNumber);
          editorRef.current.setPosition({ lineNumber, column: 1 });
          pendingLineRef.current = null;
        }
        return prevTabs;
      }

      const fileName = path.split("/").pop() || path;
      const newTab: TabData = {
        id: path,
        name: fileName,
        path,
        content,
        isPinned: false,
        isTarget: false,
      };

      setActiveTabId(path);
      return [...prevTabs, newTab];
    });
  }, [activeTabId]);

  if (!sourceCode || Object.keys(sourceCode).length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Text color="text.secondary" fontSize="sm">
          Source code not available
        </Text>
      </Box>
    );
  }

  return (
    <Box ref={containerRef} h={isFullscreen ? "100%" : undefined}>
      <HStack spacing={0} align="stretch" h={isFullscreen ? "100%" : `${height}px`} overflow="hidden">
      {/* Sidebar Panel */}
      <HStack spacing={0} w={`${sidebarWidth}px`} minW="150px" h="100%" borderRight="none" borderColor="whiteAlpha.200" align="stretch" flexShrink={0}>
        {/* Icon Tab Bar */}
        <VStack
          spacing={0}
          w="36px"
          minW="36px"
          h="100%"
          bg="bg.muted"
          borderRight="1px solid"
          borderColor="whiteAlpha.100"
          pt={1}
          align="center"
        >
          <Tooltip label="Explorer" placement="right" hasArrow>
            <IconButton
              aria-label="Explorer"
              icon={<Icon as={Files} boxSize={4} />}
              size="sm"
              variant="ghost"
              w="36px"
              h="36px"
              borderRadius={0}
              color={sidebarTab === "explorer" ? "text.primary" : "text.tertiary"}
              borderLeft="2px solid"
              borderColor={sidebarTab === "explorer" ? "primary.400" : "transparent"}
              _hover={{ color: "text.primary" }}
              onClick={() => handleSidebarTabChange("explorer")}
            />
          </Tooltip>
          <Tooltip label="Search" placement="right" hasArrow>
            <IconButton
              aria-label="Search"
              icon={<Icon as={Search} boxSize={4} />}
              size="sm"
              variant="ghost"
              w="36px"
              h="36px"
              borderRadius={0}
              color={sidebarTab === "search" ? "text.primary" : "text.tertiary"}
              borderLeft="2px solid"
              borderColor={sidebarTab === "search" ? "primary.400" : "transparent"}
              _hover={{ color: "text.primary" }}
              onClick={() => handleSidebarTabChange("search")}
            />
          </Tooltip>
        </VStack>

        {/* Sidebar Content */}
        <Box flex={1} bg="bg.muted" overflow="hidden" h="100%">
          {sidebarTab === "explorer" ? (
            <Box h="100%" display="flex" flexDirection="column">
              {/* Explorer Header */}
              <HStack
                px={3}
                py={2}
                borderBottom="1px solid"
                borderColor="whiteAlpha.100"
                flexShrink={0}
              >
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="text.tertiary"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  Explorer
                </Text>
              </HStack>

              {/* File Tree */}
              <Box flex={1} overflow="auto">
                <FileExplorerTree
                  data={fileTree}
                  onFileSelect={handleFileSelect}
                  selectedPath={activeTabId}
                  height="100%"
                  changedFiles={changedFiles}
                />
              </Box>
            </Box>
          ) : (
            <SearchPanel
              sourceCode={sourceCode}
              onResultClick={handleSearchResultClick}
              isOpen={true}
              onSearchQueryChange={handleSearchQueryChange}
            />
          )}
        </Box>
      </HStack>

      {/* Sidebar Resize Handle */}
      <Box
        w="4px"
        cursor="ew-resize"
        bg={isResizingSidebar ? "primary.400" : "whiteAlpha.100"}
        _hover={{ bg: "primary.400" }}
        onMouseDown={handleSidebarResizeStart}
        userSelect="none"
        transition="background 0.15s"
        flexShrink={0}
      />

      {/* Editor Panel */}
      <VStack spacing={0} flex={1} align="stretch" overflow="hidden">
        {/* Tabs */}
        <CodeEditorTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={handleTabClose}
        />

        {/* Diff View Mode Selector */}
        {isDiffMode && activeFileDiff && activeFileDiff.changesCount > 0 && (
          <HStack
            px={3}
            py={1.5}
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
            bg="whiteAlpha.50"
            position="relative"
            justify="center"
          >
            <TabsSelector
              mt={0}
              tabs={DiffViewOptions}
              selectedTabIndex={diffViewMode}
              setSelectedTabIndex={setDiffViewMode}
            />
            <Box position="absolute" right={3}>
              <CopyToClipboard
                textToCopy={diffViewMode === 1 && activeFileDiff ? activeFileDiff.diffCode : displayedContent}
                labelText={diffViewMode === 0 ? "Copy Old Code" : diffViewMode === 2 ? "Copy New Code" : "Copy Code with Diff"}
              />
            </Box>
          </HStack>
        )}

        {/* Monaco Editor */}
        <Box flex={1} overflow="hidden">
          {activeTab ? (
            <Editor
              key={isDiffMode ? `${activeTabId}-${diffViewMode}` : activeTabId}
              theme="vs-dark"
              language={language}
              value={displayedContent}
              height="100%"
              onMount={handleEditorMount}
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 13,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                lineNumbers: "on",
                glyphMargin: false,
                folding: true,
                renderLineHighlight: isDiffMode && diffViewMode === 1 ? "none" : "all",
                scrollbar: {
                  useShadows: false,
                  vertical: "visible",
                  horizontal: "visible",
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12,
                },
              }}
            />
          ) : (
            <Box
              h="100%"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="text.tertiary" fontSize="sm">
                Select a file to view
              </Text>
            </Box>
          )}
        </Box>
      </VStack>
    </HStack>

      {/* Resize Handle Bar (hidden in fullscreen) */}
      {!isFullscreen && (
        <Box
          h="10px"
          cursor="ns-resize"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="whiteAlpha.50"
          borderTop="1px solid"
          borderColor="whiteAlpha.100"
          _hover={{ bg: "whiteAlpha.100" }}
          onMouseDown={handleResizeStart}
          userSelect="none"
          transition="background 0.15s"
        >
          {/* Grip dots */}
          <Box
            w="36px"
            h="4px"
            borderRadius="full"
            bg="whiteAlpha.300"
          />
        </Box>
      )}
    </Box>
  );
}
