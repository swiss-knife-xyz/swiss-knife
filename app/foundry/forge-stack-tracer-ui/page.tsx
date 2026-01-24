"use client";

import React, { useCallback, useState } from "react";
import {
  Box,
  VStack,
  Text,
  Button,
  Textarea,
  Heading,
  Flex,
  HStack,
  Link,
  Icon,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "@chakra-ui/icons";
import { FiLayers } from "react-icons/fi";

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

  // Determine text color based on content
  const getTextColor = () => {
    if (node.content.startsWith("←")) {
      return node.content.startsWith("← [Revert]") ? "red.400" : "green.400";
    }
    return isExpanded ? "gray.100" : "gray.300";
  };

  return (
    <Box width="100%">
      <Button
        onClick={toggleExpand}
        variant="outline"
        size="sm"
        leftIcon={
          node.children.length > 0 ? (
            isExpanded ? (
              <ChevronDownIcon color="blue.400" />
            ) : (
              <ChevronRightIcon color="gray.400" />
            )
          ) : undefined
        }
        mb={2}
        width="100%"
        height="auto"
        justifyContent="flex-start"
        bg={isExpanded ? "whiteAlpha.100" : "whiteAlpha.50"}
        border="1px solid"
        borderColor={isExpanded ? "whiteAlpha.300" : "whiteAlpha.200"}
        opacity={opacity}
        transition="all 0.2s ease"
        _hover={{
          opacity: Math.min(1, opacity + 0.3),
          bg: "whiteAlpha.100",
          borderColor: "whiteAlpha.300",
        }}
      >
        <Text
          fontSize="sm"
          fontFamily="mono"
          isTruncated={!isExpanded}
          whiteSpace={isExpanded ? "normal" : "nowrap"}
          fontWeight={isExpanded ? "semibold" : "normal"}
          textAlign="left"
          wordBreak="break-all"
          color={getTextColor()}
          transition="color 0.2s"
          _hover={{
            color: "gray.100",
          }}
          pointerEvents={isExpanded ? "auto" : "none"}
        >
          {node.content}
        </Text>
      </Button>
      {isExpanded && node.children.length > 0 && (
        <Box pl={4} borderLeft="2px solid" borderColor="blue.400" width="100%">
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
    <Box
      p={6}
      bg="rgba(0, 0, 0, 0.05)"
      backdropFilter="blur(5px)"
      borderRadius="xl"
      border="1px solid"
      borderColor="whiteAlpha.50"
      maxW="900px"
      mx="auto"
    >
      {/* Page Header */}
      <Box mb={8} textAlign="center">
        <HStack justify="center" spacing={3} mb={4}>
          <Icon as={FiLayers} color="blue.400" boxSize={8} />
          <Heading
            size="xl"
            color="gray.100"
            fontWeight="bold"
            letterSpacing="tight"
          >
            Forge Stack Tracer
          </Heading>
        </HStack>
        <Text color="gray.400" fontSize="lg" maxW="600px" mx="auto" mb={3}>
          Visualize and explore your Foundry test stack traces interactively
        </Text>
        <HStack justify="center" spacing={2}>
          <Text color="gray.500" fontSize="sm">
            Also available as npm package:
          </Text>
          <Link
            color="blue.400"
            href="https://www.npmjs.com/package/forge-stack-tracer"
            isExternal
            fontSize="sm"
            _hover={{ color: "blue.300" }}
          >
            <HStack spacing={1}>
              <Text>forge-stack-tracer</Text>
              <ExternalLinkIcon boxSize={3} />
            </HStack>
          </Link>
        </HStack>
      </Box>

      {/* Input Section */}
      <Box
        p={5}
        bg="whiteAlpha.50"
        borderRadius="lg"
        border="1px solid"
        borderColor="whiteAlpha.200"
      >
        <VStack spacing={4} align="stretch">
          <HStack spacing={2} align="center">
            <Icon as={FiLayers} color="blue.400" boxSize={5} />
            <Text color="gray.300" fontWeight="medium">
              Stack Trace Input
            </Text>
          </HStack>
          <Textarea
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
            resize="none"
            bg="whiteAlpha.50"
            border="1px solid"
            borderColor="whiteAlpha.200"
            _hover={{ borderColor: "whiteAlpha.300" }}
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
            color="gray.100"
            _placeholder={{ color: "gray.500" }}
            fontFamily="mono"
            fontSize="sm"
          />
          <Flex justify="center">
            <Button
              onClick={() => {
                handleRenderTree();
              }}
              colorScheme="blue"
              leftIcon={<Icon as={FiLayers} boxSize={4} />}
            >
              Render Stack
            </Button>
          </Flex>
        </VStack>
      </Box>

      {/* Results Section */}
      {treeData.length > 0 && (
        <Box
          mt={6}
          p={5}
          bg="whiteAlpha.50"
          borderRadius="lg"
          border="1px solid"
          borderColor="whiteAlpha.200"
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={2} align="center">
              <Icon as={FiLayers} color="green.400" boxSize={5} />
              <Text color="gray.300" fontWeight="medium">
                Trace Visualization
              </Text>
              <Text color="gray.500" fontSize="sm">
                (click to expand/collapse)
              </Text>
            </HStack>
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
          </VStack>
        </Box>
      )}
    </Box>
  );
};

export default ForgeStackTracerUI;
