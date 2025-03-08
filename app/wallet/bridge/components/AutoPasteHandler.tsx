import { useEffect } from "react";

interface AutoPasteHandlerProps {
  pasted: boolean;
  isConnected: boolean;
  uri: string;
  connectToDapp: () => Promise<void>;
  setPasted: (pasted: boolean) => void;
}

export default function AutoPasteHandler({
  pasted,
  isConnected,
  uri,
  connectToDapp,
  setPasted,
}: AutoPasteHandlerProps) {
  // Add useEffect to handle auto-connect on paste
  useEffect(() => {
    if (pasted && isConnected && uri && uri.startsWith("wc:")) {
      connectToDapp();
      setPasted(false);
    }
  }, [uri, pasted, isConnected, connectToDapp, setPasted]);

  return null;
}
