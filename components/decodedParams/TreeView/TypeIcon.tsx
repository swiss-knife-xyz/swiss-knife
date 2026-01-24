import React from "react";
import { Icon, IconProps } from "@chakra-ui/react";
import {
  FiUser,
  FiHash,
  FiCode,
  FiType,
  FiPackage,
  FiList,
  FiToggleLeft,
  FiFileText,
} from "react-icons/fi";

type ParamBaseType =
  | "address"
  | "uint"
  | "int"
  | "bytes"
  | "string"
  | "tuple"
  | "array"
  | "bool"
  | string;

interface TypeIconProps extends Omit<IconProps, "as"> {
  baseType: ParamBaseType;
}

export function TypeIcon({ baseType, boxSize = 3, ...props }: TypeIconProps) {
  const getIcon = () => {
    // Handle address type
    if (baseType === "address") {
      return FiUser;
    }

    // Handle uint types (uint8, uint256, etc.)
    if (baseType.includes("uint") || baseType.includes("int")) {
      return FiHash;
    }

    // Handle bytes types (bytes, bytes32, bytes4, etc.)
    if (baseType.includes("bytes")) {
      return FiCode;
    }

    // Handle string type
    if (baseType === "string") {
      return FiType;
    }

    // Handle tuple type
    if (baseType === "tuple") {
      return FiPackage;
    }

    // Handle array type
    if (baseType === "array") {
      return FiList;
    }

    // Handle bool type
    if (baseType === "bool") {
      return FiToggleLeft;
    }

    // Default fallback
    return FiFileText;
  };

  return (
    <Icon
      as={getIcon()}
      boxSize={boxSize}
      flexShrink={0}
      {...props}
    />
  );
}

// Color mapping for different types (can be used for additional styling)
export function getTypeColor(baseType: ParamBaseType): string {
  if (baseType === "address") return "purple.400";
  if (baseType.includes("uint") || baseType.includes("int")) return "green.400";
  if (baseType.includes("bytes")) return "orange.400";
  if (baseType === "string") return "cyan.400";
  if (baseType === "tuple") return "pink.400";
  if (baseType === "array") return "yellow.400";
  if (baseType === "bool") return "teal.400";
  return "gray.400";
}
