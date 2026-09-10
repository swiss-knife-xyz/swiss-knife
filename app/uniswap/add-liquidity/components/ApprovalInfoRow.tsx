import { Td, Text, Tr } from "@chakra-ui/react";

interface ApprovalInfoRowProps {
  label: string;
  statusText: string;
  statusColor: string;
  showSpinner?: boolean; // Optional: for individual loading states if ever needed
}

export const ApprovalInfoRow: React.FC<ApprovalInfoRowProps> = ({
  label,
  statusText,
  statusColor,
}) => {
  return (
    <Tr>
      <Td>{label}</Td>
      <Td>
        <Text color={statusColor} fontWeight="bold">
          {statusText}
        </Text>
      </Td>
    </Tr>
  );
};
