"use client";

import {
  Box,
  HStack,
  Text,
  Badge,
  Button,
  Tooltip,
  Icon,
} from "@chakra-ui/react";
import { WarningIcon, InfoIcon, CheckCircleIcon } from "@chakra-ui/icons";
import type { ValidationError } from "@/lib/siwe";

interface IssueCardProps {
  issue: ValidationError;
  onFix?: (issue: ValidationError) => void;
}

export const IssueCard = ({ issue, onFix }: IssueCardProps) => {
  const getSeverityStyles = () => {
    switch (issue.severity) {
      case "error":
        return {
          borderColor: "red.500",
          bgColor: "red.900",
          bgOpacity: "0.2",
          icon: WarningIcon,
          iconColor: "red.400",
        };
      case "warning":
        return {
          borderColor: "yellow.500",
          bgColor: "yellow.900",
          bgOpacity: "0.2",
          icon: WarningIcon,
          iconColor: "yellow.400",
        };
      case "info":
        return {
          borderColor: "blue.500",
          bgColor: "blue.900",
          bgOpacity: "0.2",
          icon: InfoIcon,
          iconColor: "blue.400",
        };
      default:
        return {
          borderColor: "gray.500",
          bgColor: "gray.900",
          bgOpacity: "0.2",
          icon: InfoIcon,
          iconColor: "gray.400",
        };
    }
  };

  const getTypeBadgeColor = () => {
    switch (issue.type) {
      case "format":
        return "purple";
      case "security":
        return "orange";
      case "compliance":
        return "teal";
      default:
        return "gray";
    }
  };

  const styles = getSeverityStyles();

  return (
    <Box
      p={4}
      borderRadius="lg"
      border="1px solid"
      borderColor={styles.borderColor}
      bg={`${styles.bgColor}`}
      opacity="0.95"
      _hover={{ opacity: 1 }}
      transition="opacity 0.2s"
    >
      <HStack spacing={3} align="flex-start">
        <Icon
          as={styles.icon}
          color={styles.iconColor}
          boxSize={5}
          mt={0.5}
        />

        <Box flex="1">
          <HStack spacing={2} mb={1} flexWrap="wrap">
            <Badge
              colorScheme={getTypeBadgeColor()}
              variant="solid"
              fontSize="xs"
              textTransform="capitalize"
            >
              {issue.type}
            </Badge>
            <Badge
              colorScheme="gray"
              variant="outline"
              fontSize="xs"
            >
              {issue.field}
            </Badge>
            {issue.line > 0 && (
              <Text fontSize="xs" color="whiteAlpha.600">
                Line {issue.line}
              </Text>
            )}
          </HStack>

          <Text color="white" fontWeight="medium" mb={1}>
            {issue.message}
          </Text>

          {issue.suggestion && (
            <Text fontSize="sm" color="whiteAlpha.700" mt={2}>
              💡 {issue.suggestion}
            </Text>
          )}

          {issue.code && (
            <Text fontSize="xs" color="whiteAlpha.500" mt={2} fontFamily="mono">
              {issue.code}
            </Text>
          )}
        </Box>

        {issue.fixable && onFix && (
          <Tooltip label="Apply automatic fix" placement="top">
            <Button
              size="sm"
              colorScheme="green"
              variant="outline"
              onClick={() => onFix(issue)}
              _hover={{ bg: "green.900" }}
            >
              <HStack spacing={1}>
                <CheckCircleIcon boxSize={3} />
                <Text>Fix</Text>
              </HStack>
            </Button>
          </Tooltip>
        )}
      </HStack>
    </Box>
  );
};

export default IssueCard;

