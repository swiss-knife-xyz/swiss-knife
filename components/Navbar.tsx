import Link from "next/link";
import { Center, Heading } from "@chakra-ui/react";

export default function Navbar() {
  return (
    <Center pt={"10"}>
      <Heading color="custom.pale">
        <Link href="/">Swiss Knife 🔪</Link>
      </Heading>
    </Center>
  );
}
