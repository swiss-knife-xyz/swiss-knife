import React, { useRef, useEffect, useState } from "react";
import { chakra, Box, BoxProps } from "@chakra-ui/react";
import SimpleEditor from "react-simple-code-editor";
import hljs from "highlight.js/lib/core";
import registerSolidity from "highlightjs-solidity";

registerSolidity(hljs);

import "highlight.js/styles/atom-one-dark.css";

const ChakraSimpleEditor = chakra(SimpleEditor);

const defaultSolidityTemplate = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    
}`;

interface Props extends BoxProps {
  value?: string | undefined;
  ariaLabel?: string;
  readOnly?: boolean;
  canResize?: boolean;
  autoMaxWidth?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SolidityTextArea({
  value,
  ariaLabel = "Solidity code editor",
  readOnly = true,
  canResize = true,
  autoMaxWidth = false,
  className = "",
  style = {},
  ...props
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState<string>("100%");

  useEffect(() => {
    if (autoMaxWidth && boxRef.current) {
      const calculateMaxWidth = () => {
        const lines = (value ?? defaultSolidityTemplate).split("\n");
        const longestLine = lines.reduce((a, b) =>
          a.length > b.length ? a : b
        );
        const tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.position = "absolute";
        tempSpan.style.whiteSpace = "pre";
        tempSpan.style.font = window.getComputedStyle(
          boxRef.current!.querySelector("pre")!
        ).font;
        tempSpan.textContent = longestLine;
        document.body.appendChild(tempSpan);
        const width = tempSpan.getBoundingClientRect().width;
        document.body.removeChild(tempSpan);
        return `${Math.ceil(width + 40)}px`;
      };

      setMaxWidth(calculateMaxWidth());
    }
  }, [value, autoMaxWidth]);

  // Process the value to create a clean version without diff markers
  const processedValue = value
    ?.split("\n")
    .map((line) => {
      if (line.startsWith("+→") || line.startsWith("-→")) {
        return line.slice(2);
      }
      return line;
    })
    .join("\n");

  // Create a map of line numbers to their diff status
  const diffMap = new Map();
  value?.split("\n").forEach((line, index) => {
    if (line.startsWith("+→")) {
      diffMap.set(index, "added");
    } else if (line.startsWith("-→")) {
      diffMap.set(index, "removed");
    }
  });

  return (
    <Box
      ref={boxRef}
      h="60"
      overflowY="scroll"
      className="scroll"
      bg={"whiteAlpha.50"}
      border="1px"
      borderColor={"gray.400"}
      roundedLeft="md"
      roundedRight="4px"
      resize={canResize ? "both" : "none"}
      width={autoMaxWidth ? maxWidth : undefined}
      {...props}
    >
      <ChakraSimpleEditor
        value={processedValue ?? defaultSolidityTemplate}
        onValueChange={() => {}}
        readOnly={readOnly}
        highlight={(code) => {
          // First highlight the entire code block
          const highlightedCode = hljs.highlight(code, {
            language: "solidity",
          }).value;

          // Split the highlighted code into lines
          const highlightedLines = highlightedCode.split("\n");

          // Process each line, applying the appropriate diff class
          return highlightedLines
            .map((line, index) => {
              const diffStatus = diffMap.get(index);
              if (diffStatus === "added") {
                return `<div class="line-wrapper added-line"><span class="line-content">${line}</span></div>`;
              } else if (diffStatus === "removed") {
                return `<div class="line-wrapper removed-line"><span class="line-content">${line}</span></div>`;
              }
              return `<div class="line-wrapper"><span class="line-content">${line}</span></div>`;
            })
            .join("\n");
        }}
        style={{
          fontFamily: "'Fira Code', 'Fira Mono', monospace",
          fontSize: "14px",
          lineHeight: "1.2",
          padding: "1rem",
        }}
        textareaClassName="focus:outline-none"
        preClassName="language-solidity"
        tabSize={2}
        insertSpaces={true}
        ignoreTabKey={true}
        sx={{
          'pre [class*="hljs"]': {
            background: "transparent !important",
          },
          ".line-wrapper": {
            display: "inline-block",
            width: "100%",
          },
          ".line-content": {
            display: "inline-block",
            width: "100%",
          },
          pre: {
            "& .added-line": {
              display: "inline-block",
              backgroundColor: "rgba(40, 167, 69, 0.2) !important",
            },
            "& .removed-line": {
              display: "inline-block",
              backgroundColor: "rgba(220, 53, 69, 0.2) !important",
            },
          },
        }}
      />
    </Box>
  );
}
