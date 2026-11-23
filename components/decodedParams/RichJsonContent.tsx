import { useId, useState } from "react";
import { Box, Button, Text } from "@chakra-ui/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { isAddress } from "viem";
import { isBigInt } from "@/utils";
import { ParamValue } from "./ParamValue";
import { parseJsonContent } from "./stringContent";

function Scalar({ value, chainId }: { value: unknown; chainId?: number }) {
  const text = value === null ? "null" : String(value);
  // JSON has no ABI type; infer useful controls, then use the same dispatcher.
  const type =
    typeof value !== "string"
      ? "string"
      : isAddress(value)
        ? "address"
        : /^0x[\da-f]*$/i.test(value)
          ? "bytes"
          : isBigInt(value)
            ? value.startsWith("-")
              ? "int256"
              : "uint256"
            : "string";
  return (
    <ParamValue
      arg={{ name: "", type, baseType: type, value: text, rawValue: text }}
      chainId={chainId}
      inlinePreview
    />
  );
}

function JsonEntry({
  name,
  value,
  chainId,
  depth,
}: {
  name: string;
  value: unknown;
  chainId?: number;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const [hasOpened, setHasOpened] = useState(depth < 1);
  const contentId = useId();
  const object = parseJsonContent(value);
  if (
    object &&
    !Array.isArray(object) &&
    typeof object.trait_type === "string" &&
    Object.hasOwn(object, "value")
  ) {
    return (
      <JsonEntry
        name={object.trait_type}
        value={object.value}
        chainId={chainId}
        depth={depth}
      />
    );
  }
  if (object !== undefined) {
    const entries = Object.entries(object);
    return (
      <Box
        minW={0}
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        _last={{ borderBottom: 0 }}
      >
        <Button
          variant="ghost"
          w="full"
          h="auto"
          minH={8}
          px={0}
          py={1.5}
          justifyContent="flex-start"
          gap={2}
          fontWeight="normal"
          textAlign="left"
          whiteSpace="normal"
          onClick={() => {
            setHasOpened(true);
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-controls={contentId}
        >
          <Box
            as={open ? ChevronDown : ChevronRight}
            boxSize={3.5}
            flexShrink={0}
            color="text.tertiary"
          />
          <Text
            as="span"
            fontSize="12px"
            fontFamily="mono"
            overflowWrap="anywhere"
            color="text.secondary"
          >
            {name}
          </Text>
          <Text
            as="span"
            fontSize="10px"
            color="text.tertiary"
            ml="auto"
            flexShrink={0}
          >
            {entries.length} {Array.isArray(object) ? "items" : "fields"}
          </Text>
        </Button>
        <Box
          id={contentId}
          hidden={!open}
          pl={3}
          ml={1.5}
          borderLeft="1px solid"
          borderColor="border.default"
          pb={1}
        >
          {hasOpened &&
            (entries.length ? (
              entries.map(([key, child]) => (
                <JsonEntry
                  key={key}
                  name={Array.isArray(object) ? `[${key}]` : key}
                  value={child}
                  chainId={chainId}
                  depth={depth + 1}
                />
              ))
            ) : (
              <Text py={2} fontSize="xs" color="text.tertiary">
                {Array.isArray(object) ? "Empty array" : "Empty object"}
              </Text>
            ))}
        </Box>
      </Box>
    );
  }
  return (
    <Box
      className="rich-json-row"
      minW={0}
      py={2.5}
      borderBottom="1px solid"
      borderColor="whiteAlpha.100"
      _last={{ borderBottom: 0 }}
      display="grid"
      gap={1.5}
      sx={{
        "@container rich-string (min-width: 640px)": {
          gridTemplateColumns: "minmax(100px, 140px) minmax(0, 1fr)",
          columnGap: "16px",
          alignItems: "start",
        },
      }}
    >
      <Text
        fontSize="11px"
        fontFamily="mono"
        color="text.secondary"
        overflowWrap="anywhere"
        lineHeight="20px"
      >
        {name}
      </Text>
      <Box minW={0}>
        <Scalar value={value} chainId={chainId} />
      </Box>
    </Box>
  );
}

export function RichJsonContent({
  value,
  chainId,
}: {
  value: Record<string, unknown> | unknown[];
  chainId?: number;
}) {
  const entries = Object.entries(value);
  return entries.length ? (
    <Box minW={0}>
      {entries.map(([key, child]) => (
        <JsonEntry
          key={key}
          name={Array.isArray(value) ? `[${key}]` : key}
          value={child}
          chainId={chainId}
          depth={0}
        />
      ))}
    </Box>
  ) : (
    <Text fontSize="xs" color="text.tertiary">
      {Array.isArray(value) ? "Empty array" : "Empty object"}
    </Text>
  );
}
