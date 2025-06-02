import React, { useRef, useEffect, useState } from "react";
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
  onChange?: (value: string) => void;
  setValue?: (value: string) => void; // for backward compatibility
  ariaLabel?: string;
  readOnly?: boolean;
  canResize?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onPasteCallback?: (json: any) => void;
  placeholder?: string;
  autoMaxWidth?: boolean; // add back autoMaxWidth
  language?: string; // add language prop for syntax highlighting
}

export function JsonTextArea({
  value,
  onChange,
  setValue,
  ariaLabel = "JSON editor",
  readOnly = false,
  canResize = true,
  className = "",
  style = {},
  onPasteCallback,
  placeholder = "",
  autoMaxWidth = false,
  language = "json",
  ...props
}: JsonTextAreaProps & Omit<BoxProps, keyof JsonTextAreaProps>) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState<string>("100%");

  useEffect(() => {
    if (autoMaxWidth && boxRef.current) {
      const calculateMaxWidth = () => {
        const lines = value.split("\n");
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
        return `${Math.ceil(width + 40)}px`; // Add some padding
      };

      setMaxWidth(calculateMaxWidth());
    }
  }, [value, autoMaxWidth]);

  const handleChange = (newValue: string) => {
    onChange?.(newValue);
    setValue?.(newValue); // call setValue if provided
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    try {
      // Try to parse and prettify the JSON
      const parsedJson = JSON.parse(pastedText);
      const prettifiedJson = JSON.stringify(parsedJson, null, 2);
      handleChange(prettifiedJson);
      // Pass the parsed JSON directly to callback
      onPasteCallback?.(parsedJson);
    } catch (err) {
      // If parsing fails, just set the raw text
      handleChange(pastedText);
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
      width={autoMaxWidth ? maxWidth : undefined}
      {...props}
    >
      <ChakraSimpleEditor
        value={value}
        onValueChange={handleChange}
        onPaste={handlePaste}
        readOnly={readOnly}
        placeholder={placeholder}
        highlight={(code) => {
          try {
            return hljs.highlight(code, {
              language: language,
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
        preClassName={`language-${language}`}
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
