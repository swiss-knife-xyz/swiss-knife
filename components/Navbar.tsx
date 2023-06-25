import Link from "next/link";
import { Center, Heading } from "@chakra-ui/react";
import { baseURL } from "@/config";

export default function Navbar() {
  return (
    <Center pt={"10"}>
      <Heading color="custom.pale">
        <Link href={baseURL}>Swiss Knife 🔪</Link>
      </Heading>
    </Center>
  );
}
