import React, { useRef, useEffect, useState } from "react";
import { chakra, Box, BoxProps } from "@chakra-ui/react";
import SimpleEditor from "react-simple-code-editor";

import "@/style/scroll.css";
import "highlight.js/styles/obsidian.css";
// only import the required language support
import hljs from "highlight.js/lib/core";
hljs.registerLanguage("json", require("highlight.js/lib/languages/json"));

const ChakraSimpleEditor = chakra(SimpleEditor);

const defaultABIPlaceholder = " \n \n \n \n \n \n \n \n \n ";

interface Props extends BoxProps {
  value: string | undefined;
  setValue: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  readOnly?: boolean;
  canResize?: boolean;
  autoMaxWidth?: boolean;
}

function JsonTextArea({
  value,
  setValue,
  placeholder,
  ariaLabel,
  readOnly,
  canResize,
  autoMaxWidth,
  ...props
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [maxWidth, setMaxWidth] = useState<string>("100%");

  useEffect(() => {
    if (autoMaxWidth && boxRef.current) {
      const calculateMaxWidth = () => {
        const lines = (value ?? defaultABIPlaceholder).split("\n");
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
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value ?? defaultABIPlaceholder}
        onValueChange={setValue}
        readOnly={readOnly}
        highlight={(contents) =>
          hljs.highlight(contents, { language: "json" }).value
        }
        style={{
          fontFamily: "SFMono-Regular,Menlo,Monaco,Consolas,monospace",
          fontSize: "14px",
          lineHeight: "20px",
        }}
        tabSize={2}
        insertSpaces={true}
        ignoreTabKey={true}
        padding={2}
      />
    </Box>
  );
}

export default JsonTextArea;
