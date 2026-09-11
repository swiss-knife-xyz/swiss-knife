"use client";

import {
  Box,
  CloseButton,
  HStack,
  Spinner,
  Text,
  type ToastProps,
} from "@chakra-ui/react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const statusStyles = {
  success: {
    label: "Success",
    surface: "rgba(20, 83, 45, 0.96)",
    border: "rgba(74, 222, 128, 0.42)",
    icon: CheckCircle2,
    iconColor: "#86EFAC",
    titleColor: "#F0FDF4",
    textColor: "#DCFCE7",
    mutedColor: "rgba(220, 252, 231, 0.72)",
    codeBg: "rgba(6, 78, 59, 0.56)",
    codeColor: "#F0FDF4",
    closeHoverBg: "rgba(220, 252, 231, 0.10)",
  },
  error: {
    label: "Error",
    surface: "rgba(127, 29, 29, 0.96)",
    border: "rgba(248, 113, 113, 0.46)",
    icon: AlertCircle,
    iconColor: "#FCA5A5",
    titleColor: "#FFF1F2",
    textColor: "#FFE4E6",
    mutedColor: "rgba(255, 228, 230, 0.72)",
    codeBg: "rgba(69, 10, 10, 0.45)",
    codeColor: "#FFF1F2",
    closeHoverBg: "rgba(255, 228, 230, 0.12)",
  },
  warning: {
    label: "Warning",
    surface: "rgba(120, 53, 15, 0.96)",
    border: "rgba(251, 191, 36, 0.48)",
    icon: AlertTriangle,
    iconColor: "#FCD34D",
    titleColor: "#FFFBEB",
    textColor: "#FEF3C7",
    mutedColor: "rgba(254, 243, 199, 0.72)",
    codeBg: "rgba(69, 26, 3, 0.45)",
    codeColor: "#FFFBEB",
    closeHoverBg: "rgba(254, 243, 199, 0.12)",
  },
  info: {
    label: "Info",
    surface: "rgba(30, 64, 175, 0.94)",
    border: "rgba(96, 165, 250, 0.44)",
    icon: Info,
    iconColor: "#BFDBFE",
    titleColor: "#EFF6FF",
    textColor: "#DBEAFE",
    mutedColor: "rgba(219, 234, 254, 0.72)",
    codeBg: "rgba(30, 58, 138, 0.48)",
    codeColor: "#EFF6FF",
    closeHoverBg: "rgba(219, 234, 254, 0.12)",
  },
  loading: {
    label: "Loading",
    surface: "rgba(30, 64, 175, 0.94)",
    border: "rgba(96, 165, 250, 0.44)",
    icon: CheckCircle2,
    iconColor: "#BFDBFE",
    titleColor: "#EFF6FF",
    textColor: "#DBEAFE",
    mutedColor: "rgba(219, 234, 254, 0.72)",
    codeBg: "rgba(30, 58, 138, 0.48)",
    codeColor: "#EFF6FF",
    closeHoverBg: "rgba(219, 234, 254, 0.12)",
  },
  default: {
    label: "Notice",
    surface: "rgba(39, 39, 42, 0.98)",
    border: "rgba(255, 255, 255, 0.18)",
    icon: Info,
    iconColor: "#D4D4D8",
    titleColor: "#FAFAFA",
    textColor: "#E4E4E7",
    mutedColor: "rgba(228, 228, 231, 0.68)",
    codeBg: "rgba(24, 24, 27, 0.72)",
    codeColor: "#FAFAFA",
    closeHoverBg: "rgba(255, 255, 255, 0.10)",
  },
} as const;

const getReadableDescription = (description: string) => {
  const readable = description.split(
    /\n\n(?:Request Arguments:|Details:|Version:)/
  )[0];
  return readable.trim() || description;
};

export function EthToast(props: ToastProps) {
  const {
    status = "default",
    title,
    description,
    icon,
    isClosable,
    onClose,
    id,
  } = props;
  const tone = statusStyles[status] ?? statusStyles.default;
  const Icon = tone.icon;
  const titleId = id ? `toast-${id}-title` : undefined;
  const descriptionId = id ? `toast-${id}-description` : undefined;
  const readableDescription =
    typeof description === "string"
      ? getReadableDescription(description)
      : description;

  return (
    <Box
      id={id ? `toast-${id}` : undefined}
      bg={tone.surface}
      color={tone.textColor}
      border="1px solid"
      borderColor={tone.border}
      borderRadius="lg"
      boxShadow="0 16px 40px rgba(0, 0, 0, 0.5)"
      maxW="min(560px, calc(100vw - 32px))"
      minW={{ base: "calc(100vw - 32px)", sm: "360px" }}
      overflow="hidden"
      position="relative"
      px={4}
      py={3.5}
      pr={isClosable ? 11 : 4}
    >
      <HStack align="flex-start" spacing={2.5}>
        <Box color={tone.iconColor} flexShrink={0} lineHeight={0} mt="1px">
          {status === "loading" ? (
            <Spinner color={tone.iconColor} size="sm" thickness="2px" />
          ) : icon ? (
            icon
          ) : (
            <Icon size={20} strokeWidth={2.2} />
          )}
        </Box>

        <Box flex="1" minW={0}>
          {title ? (
            <Box
              id={titleId}
              color={tone.titleColor}
              fontSize="md"
              fontWeight="semibold"
              lineHeight="20px"
              overflowWrap="anywhere"
            >
              {title}
            </Box>
          ) : null}

          {readableDescription ? (
            <Box
              id={descriptionId}
              color={tone.textColor}
              fontSize="sm"
              lineHeight="20px"
              mt={title ? 1 : 0}
              overflowWrap="anywhere"
              sx={{
                "& a": {
                  color: tone.titleColor,
                  textDecoration: "none",
                },
                "& code": {
                  bg: tone.codeBg,
                  borderRadius: "sm",
                  color: tone.codeColor,
                  fontFamily: "mono",
                  fontSize: "xs",
                  px: 1,
                },
              }}
            >
              {typeof readableDescription === "string" ? (
                <Text noOfLines={4} whiteSpace="pre-wrap">
                  {readableDescription}
                </Text>
              ) : (
                readableDescription
              )}
            </Box>
          ) : null}

          {!title && !readableDescription ? (
            <Box
              color={tone.textColor}
              fontSize="sm"
              lineHeight="20px"
              overflowWrap="anywhere"
            >
              {tone.label}
            </Box>
          ) : null}
        </Box>
      </HStack>

      {isClosable ? (
        <CloseButton
          aria-label="Dismiss notification"
          color={tone.mutedColor}
          onClick={onClose}
          position="absolute"
          right={2}
          size="sm"
          top={2}
          _hover={{ bg: tone.closeHoverBg, color: tone.titleColor }}
        />
      ) : null}
    </Box>
  );
}
