import { Badge } from "@chakra-ui/react";

export const callColors: Record<string, string> = {
  CALL: "blue.300",
  STATICCALL: "cyan.300",
  DELEGATECALL: "orange.300",
  CALLCODE: "orange.300",
  CREATE: "green.300",
  CREATE2: "green.300",
  SELFDESTRUCT: "red.300",
};
/** Explicit colors bypass the app's intentionally neutral shared Badge variant. */
export function TraceBadge({
  children,
  color = "blue.300",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <Badge
      color={color}
      bg="transparent"
      border="1px solid"
      borderColor={color}
      px={1.5}
      fontSize="10px"
      lineHeight="18px"
      flexShrink={0}
    >
      {children}
    </Badge>
  );
}
