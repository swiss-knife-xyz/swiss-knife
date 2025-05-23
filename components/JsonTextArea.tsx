import React, { useRef } from "react";
import { chakra, Box, BoxProps } from "@chakra-ui/react";
import SimpleEditor from "react-simple-code-editor";
import hljs from "highlight.js/lib/core";
import json from "highlight.js/lib/languages/json";

import "@/style/scroll.css";
import "highlight.js/styles/atom-one-dark.css";

hljs.registerLanguage("json", json);

const ChakraSimpleEditor = chakra(SimpleEditor);

interface JsonTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  readOnly?: boolean;
  canResize?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onPasteCallback?: (json: any) => void;
}

export function JsonTextArea({
  value,
  onChange,
  ariaLabel = "JSON editor",
  readOnly = false,
  canResize = true,
  className = "",
  style = {},
  onPasteCallback,
  ...props
}: JsonTextAreaProps & Omit<BoxProps, keyof JsonTextAreaProps>) {
  const boxRef = useRef<HTMLDivElement>(null);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    try {
      // Try to parse and prettify the JSON
      const parsedJson = JSON.parse(pastedText);
      const prettifiedJson = JSON.stringify(parsedJson, null, 2);
      onChange(prettifiedJson);
      // Pass the parsed JSON directly to callback
      onPasteCallback?.(parsedJson);
    } catch (err) {
      // If parsing fails, just set the raw text
      onChange(pastedText);
    }
  };

  return (
    <Box
      ref={boxRef}
      overflowY="scroll"
      className={`scroll ${className}`}
      bg={"whiteAlpha.50"}
      border="1px"
      borderColor={"gray.400"}
      roundedLeft="md"
      roundedRight="4px"
      resize={canResize ? "both" : "none"}
      position="relative"
      {...props}
    >
      <ChakraSimpleEditor
        value={value}
        onValueChange={onChange}
        onPaste={handlePaste}
        readOnly={readOnly}
        highlight={(code) => {
          try {
            return hljs.highlight(code, {
              language: "json",
            }).value;
          } catch {
            return code; // Fallback to raw text if highlighting fails
          }
        }}
        style={{
          fontFamily: "'Fira Code', 'Fira Mono', monospace",
          fontSize: "14px",
          lineHeight: "1.2",
          padding: "1rem",
          minHeight: "100%",
          ...style,
        }}
        textareaClassName="focus:outline-none"
        preClassName="language-json"
        tabSize={2}
        insertSpaces={true}
        ignoreTabKey={true}
        sx={{
          'pre [class*="hljs"]': {
            background: "transparent !important",
          },
          "& textarea, & pre": {
            minHeight: "inherit",
          },
        }}
      />
    </Box>
  );
}
