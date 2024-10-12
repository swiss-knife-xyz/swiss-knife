import { Td, TableCellProps } from "@chakra-ui/react";

interface LabelProps extends TableCellProps {
  children: React.ReactNode;
}

export const Label = ({ children, ...props }: LabelProps) => (
  <Td textAlign="center" {...props}>
    {children}
  </Td>
);
