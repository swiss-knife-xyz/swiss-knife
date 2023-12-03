import React from "react";
import { chakra, Box, useColorMode } from "@chakra-ui/react";
import SimpleEditor from "react-simple-code-editor";

import "@/style/scroll.css";
import "highlight.js/styles/obsidian.css";
// only import the required language support
import hljs from "highlight.js/lib/core";
hljs.registerLanguage("json", require("highlight.js/lib/languages/json"));

const ChakraSimpleEditor = chakra(SimpleEditor);

const defaultABIPlaceholder = " \n \n \n \n \n \n \n \n \n ";

interface Props {
  value: string | undefined;
  setValue: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  readOnly?: boolean;
  canResize?: boolean;
}

function JsonTextArea({
  value,
  setValue,
  placeholder,
  ariaLabel,
  readOnly,
  canResize,
}: Props) {
  return (
    <Box
      h="60"
      overflowY="scroll"
      className="scroll"
      bg={"whiteAlpha.50"}
      border="1px"
      borderColor={"gray.400"}
      roundedLeft="md"
      roundedRight="4px"
      resize={canResize ? "both" : "none"}
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
        fontFamily={"SFMono-Regular,Menlo,Monaco,Consolas,monospace"}
        tabSize={2}
        insertSpaces={true}
        ignoreTabKey={true}
        padding={2}
      />
    </Box>
  );
}

export default JsonTextArea;
