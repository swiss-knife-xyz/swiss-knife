import { Badge, Icon } from "@chakra-ui/react";
import {
  FiHash,
  FiUser,
  FiCode,
  FiHelpCircle,
  FiType,
  FiArrowRightCircle,
} from "react-icons/fi";

type TypeBadgeProps = {
  type: string;
};

export default function TypeBadge({ type }: TypeBadgeProps) {
  const isNumeric =
    type.toLowerCase().includes("int") ||
    type.toLowerCase().includes("uint") ||
    type.toLowerCase().includes("fixed") ||
    type.toLowerCase().includes("ufixed");
  const isAddress = type.toLowerCase() === "address";
  const isBytes = type.toLowerCase().startsWith("bytes");
  const isBool = type.toLowerCase() === "bool";
  const isString = type.toLowerCase() === "string";

  const isCustomType =
    !isNumeric && !isAddress && !isBytes && !isBool && !isString;

  let colorScheme = "blue";
  let IconComponent = FiType;

  if (isNumeric) {
    colorScheme = "yellow";
    IconComponent = FiHash;
  } else if (isAddress) {
    colorScheme = "teal";
    IconComponent = FiUser;
  } else if (isBytes) {
    colorScheme = "orange";
    IconComponent = FiCode;
  } else if (isBool) {
    colorScheme = "pink";
    IconComponent = FiHelpCircle;
  } else if (isCustomType) {
    colorScheme = "purple";
    IconComponent = FiArrowRightCircle;
  }

  return (
    <Badge
      colorScheme={colorScheme}
      variant="subtle"
      px={2}
      py={0.5}
      borderRadius="xl"
      mr={2}
      fontSize="xs"
      textTransform="none"
      display="flex"
      alignItems="center"
      gap={1}
    >
      <Icon as={IconComponent} boxSize={3} />
      {type}
    </Badge>
  );
}
