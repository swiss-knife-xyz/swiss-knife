import { getMetadata } from "@/utils";

export const metadata = getMetadata({
  title: "Character Counter | ETH.sh",
  description:
    "Get the length of any arbitrary input string or its subsection.",
  images: "https://eth.sh/og/character-counter.png",
});

const CharacterCounterLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <>{children}</>;
};

export default CharacterCounterLayout;
