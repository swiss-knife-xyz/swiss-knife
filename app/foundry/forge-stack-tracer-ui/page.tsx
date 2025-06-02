"use client";

import React, { useCallback, useState } from "react";
import {
  Box,
  VStack,
  Text,
  Button,
  useColorModeValue,
  Textarea,
  Heading,
  Flex,
  HStack,
  Link,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";

interface TraceNode {
  content: string;
  children: TraceNode[];
  depth: number;
}

const parseTrace = (trace: string): TraceNode[] => {
  const lines = trace.split("\n");
  const roots: TraceNode[] = [];
  let currentRoot: TraceNode | null = null;
  const stack: TraceNode[] = [];

  const traceLineRegex = /^[\s│├─└]+/;
  const passLineRegex = /^\[PASS\]/;

  lines.forEach((line) => {
    if (line.trim() === "Traces:") {
      if (currentRoot) {
        roots.push(currentRoot);
      }
      currentRoot = null;
      stack.length = 0;
    } else if (
      currentRoot === null &&
      line.trim() !== "" &&
      !passLineRegex.test(line)
    ) {
      currentRoot = { content: line.trim(), children: [], depth: 0 };
      stack.push(currentRoot);
    } else if (traceLineRegex.test(line)) {
      const trimmedLine = line.replace(/[│├─└]\s*/g, "").trim();
      if (!trimmedLine) return;

      const depth = (line.match(/[│]/g) || []).length;
      const newNode: TraceNode = { content: trimmedLine, children: [], depth };

      while (stack.length > 1 && depth <= stack[stack.length - 1].depth) {
        stack.pop();
      }

      stack[stack.length - 1].children.push(newNode);
      stack.push(newNode);
    }
  });

  if (currentRoot) {
    roots.push(currentRoot);
  }

  if (roots.length === 0) {
    throw new Error("No valid trace found");
  }

  return roots;
};

const TraceNodeComponent: React.FC<{
  node: TraceNode;
  expandedDepth: number;
  maxExpandedDepth: number;
  setMaxExpandedDepth: React.Dispatch<React.SetStateAction<number>>;
  allNodes: TraceNode[];
}> = ({
  node,
  expandedDepth,
  maxExpandedDepth,
  setMaxExpandedDepth,
  allNodes,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const bgColor = useColorModeValue("gray.100", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const recalculateMaxDepth = useCallback(() => {
    const maxDepth = Math.max(
      ...allNodes
        .filter(
          (n) =>
            n.depth <= expandedDepth || (n.depth === node.depth && isExpanded)
        )
        .map((n) => n.depth)
    );
    setMaxExpandedDepth(maxDepth);
  }, [allNodes, expandedDepth, isExpanded, node.depth, setMaxExpandedDepth]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    recalculateMaxDepth();
  };

  // Calculate opacity based on the depth and max expanded depth
  const opacity =
    node.depth === maxExpandedDepth
      ? 1
      : Math.max(0.15, 1 - (maxExpandedDepth - node.depth) * 0.4);

  return (
    <Box width="100%">
      <Button
        onClick={toggleExpand}
        variant="outline"
        size="sm"
        leftIcon={
          node.children.length > 0 ? (
            isExpanded ? (
              <ChevronDownIcon />
            ) : (
              <ChevronRightIcon />
            )
          ) : undefined
        }
        mb={2}
        width="100%"
        height="auto"
        justifyContent="flex-start"
        bg={bgColor}
        borderColor={borderColor}
        opacity={opacity}
        transition="opacity 0.2s, background-color 0.2s"
        _hover={{
          opacity: Math.min(1, opacity + 0.3),
          bg: useColorModeValue("gray.200", "gray.600"),
        }}
      >
        <Text
          fontSize="sm"
          isTruncated={!isExpanded}
          whiteSpace={isExpanded ? "normal" : "nowrap"}
          fontWeight={isExpanded ? "bolder" : "normal"}
          textAlign="left"
          wordBreak="break-all"
          color={
            node.content.startsWith("←")
              ? node.content.startsWith("← [Revert]")
                ? "red.300"
                : "green.300"
              : isExpanded
              ? "white"
              : "whiteAlpha.800"
          }
          transition="color 0.2s"
          _hover={{
            color: useColorModeValue("black", "white"),
          }}
          pointerEvents={isExpanded ? "auto" : "none"}
        >
          {node.content}
        </Text>
      </Button>
      {isExpanded && node.children.length > 0 && (
        <Box pl={4} borderLeft="1px" borderColor={borderColor} width="100%">
          {node.children.map((child, index) => (
            <TraceNodeComponent
              key={index}
              node={child}
              expandedDepth={node.depth + 1}
              maxExpandedDepth={maxExpandedDepth}
              setMaxExpandedDepth={setMaxExpandedDepth}
              allNodes={allNodes}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

const ForgeStackTracerUI = () => {
  const [trace, setTrace] = useState("");
  const [treeData, setTreeData] = useState<TraceNode[]>([]);
  const [maxExpandedDepth, setMaxExpandedDepth] = useState(0);
  const [allNodes, setAllNodes] = useState<TraceNode[]>([]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTrace(event.target.value);
  };

  const handleRenderTree = (_trace?: string) => {
    const parsedData = parseTrace(_trace ?? trace);
    setTreeData(parsedData);
    setMaxExpandedDepth(0);

    // Flatten the tree to get all nodes
    const flattenTree = (nodes: TraceNode[]): TraceNode[] =>
      nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
    setAllNodes(flattenTree(parsedData));
  };

  return (
    <Flex flexDir={"column"} alignItems={"center"} w="100%">
      <Heading size="lg">Forge Tests Stack Tracer UI</Heading>
      <HStack mt="1rem">
        <Text opacity={0.8}>Try the npm package!</Text>
        <Link
          color={"blue.300"}
          href="https://www.npmjs.com/package/forge-stack-tracer"
          isExternal
        >
          <HStack>
            <Text>forge-stack-tracer</Text>
            <ExternalLinkIcon />
          </HStack>
        </Link>
      </HStack>
      <Textarea
        mt="1rem"
        w="30rem"
        value={trace}
        onChange={handleInputChange}
        onPaste={(e) => {
          e.preventDefault();
          const _trace = e.clipboardData.getData("text");
          setTrace(_trace);
          handleRenderTree(_trace);
        }}
        placeholder={`Paste your forge tests stack trace here...
Example:

[PASS] test_tokenBalance()
Traces:
  [438338] TokensTest::test_tokenBalance()
    └─ [307] Token::balanceOf() [staticcall]
          └─ ← [Return] 900
`}
        height="200px"
        maxWidth="100%"
        resize="none"
      />
      <Button
        my="1.5rem"
        maxW="10rem"
        onClick={() => {
          handleRenderTree();
        }}
        colorScheme="blue"
      >
        Render Stack
      </Button>
      {treeData.length > 0 && (
        <Box w="40rem" px="1rem">
          <VStack align="stretch" spacing={2} width="100%">
            {treeData.map((root, index) => (
              <TraceNodeComponent
                key={index}
                node={root}
                expandedDepth={0}
                maxExpandedDepth={maxExpandedDepth}
                setMaxExpandedDepth={setMaxExpandedDepth}
                allNodes={allNodes}
              />
            ))}
          </VStack>
        </Box>
      )}
    </Flex>
  );
};

export default ForgeStackTracerUI;
