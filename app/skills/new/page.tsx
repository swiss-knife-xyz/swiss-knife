"use client";

import { Box, Grid, Image, Text } from "@chakra-ui/react";
import { useEffect } from "react";
import { skillResources, type SkillResource } from "../data";

const newSkillIds = [
  "goldrush-agent-tools",
  "poidh-bounty",
  "yo-protocol-skills",
  "jaw-skill",
  "veil-cash-mcp",
  "quillshield-skills",
  "foundry-mcp-server",
  "walletconnect-agent-sdk",
] as const;

const resourcesById = new Map(
  skillResources.map((resource) => [resource.id, resource])
);

const newSkillResources = newSkillIds.flatMap((id) => {
  const resource = resourcesById.get(id);
  return resource ? [resource] : [];
});

const getFaviconUrl = (domain: string) =>
  `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    `https://${domain}`
  )}&sz=128`;

const formatResourceUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    return `${host}${path}`;
  } catch {
    return url;
  }
};

const NewSkillCard = ({
  resource,
  gridColumn,
}: {
  resource: SkillResource;
  gridColumn?: string;
}) => {
  const hasCustomLogoBg = Boolean(resource.logoBg);
  const subtext = `${resource.provider} / ${formatResourceUrl(resource.url)}`;

  return (
    <Box
      display="grid"
      gridTemplateColumns="68px minmax(0, 1fr)"
      alignItems="center"
      gap="24px"
      gridColumn={gridColumn}
      justifySelf={gridColumn ? "center" : undefined}
      h="92px"
      w="100%"
      maxW={gridColumn ? "500px" : undefined}
      minW={0}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        w="68px"
        h="68px"
        borderRadius="12px"
        bg={resource.logoBg ?? "rgba(255,255,255,0.94)"}
        border="1px solid"
        borderColor={
          hasCustomLogoBg ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.18)"
        }
        boxShadow="0 18px 38px rgba(0,0,0,0.26), inset 0 0 0 1px rgba(255,255,255,0.07)"
        overflow="hidden"
      >
        <Image
          src={getFaviconUrl(resource.logoDomain)}
          alt=""
          w="46px"
          h="46px"
          objectFit="contain"
        />
      </Box>

      <Box minW={0}>
        <Text
          color="#F4F4F5"
          fontSize="25px"
          lineHeight="1.08"
          fontWeight="700"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {resource.name}
        </Text>
        <Text
          mt="10px"
          color="#8D8D96"
          fontSize="22px"
          lineHeight="1.1"
          fontWeight="500"
          whiteSpace="nowrap"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {subtext}
        </Text>
      </Box>
    </Box>
  );
};

const NewSkillsPage = () => {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.head.appendChild(style);

    const hideDevPortal = () => {
      document.querySelectorAll("nextjs-portal").forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.display = "none";
        }
      });
    };

    hideDevPortal();
    const interval = window.setInterval(hideDevPortal, 250);

    return () => {
      window.clearInterval(interval);
      style.remove();
    };
  }, []);

  return (
    <Box
      as="main"
      minH="100dvh"
      bg="#0B0B0D"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={{ base: "28px", md: "56px" }}
      py={{ base: "44px", md: "64px" }}
      overflow="hidden"
    >
      <Grid
        templateColumns="repeat(2, minmax(0, 500px))"
        templateRows="repeat(4, 92px)"
        columnGap="72px"
        rowGap="32px"
        w="min(1072px, 100%)"
      >
        {newSkillResources.map((resource) => (
          <NewSkillCard key={resource.id} resource={resource} />
        ))}
      </Grid>
    </Box>
  );
};

export default NewSkillsPage;
