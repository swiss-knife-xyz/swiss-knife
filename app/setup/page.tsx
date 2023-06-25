"use client";
import { Button, Center } from "@chakra-ui/react";

export default function Setup() {
  const createIndexAndEmbeddings = async () => {
    try {
      const result = await fetch("/api/setup", {
        method: "POST",
      });
      const json = await result.json();
      console.log("result: ", json);
    } catch (err) {
      console.log("err:", err);
    }
  };

  return (
    <Center mt="5rem">
      <Button onClick={createIndexAndEmbeddings}>
        Create index and embeddings
      </Button>
    </Center>
  );
}
