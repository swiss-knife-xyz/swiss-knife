import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Character Counter | Swiss-Knife.xyz",
  description:
    "Get the length of any arbitrary input string or its subsection.",
  images: "https://swiss-knife.xyz/og/character-counter.png",
});

const CharacterCounterLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default CharacterCounterLayout;
