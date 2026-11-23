"use client";
import {
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from "@chakra-ui/react";
import { Download } from "lucide-react";
import { compilerVersion, standardJsonInput } from "@/lib/solidity/settings";
import type { CompilerBuild } from "./useSolidityCompiler";
export function BuildDownloads({ build }: { build: CompilerBuild }) {
  const download = (output: boolean) => {
    const data = output
      ? build.output
      : standardJsonInput(build.input.sources, build.input.settings);
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `solc-${compilerVersion(build.input.settings.version)}-${output ? "output" : "input"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Menu size="compact" placement="bottom-end">
      <MenuButton
        as={IconButton}
        size="xs"
        variant="ghost"
        aria-label="Download build JSON"
        title="Download build JSON"
        icon={<Download size={15} />}
      />
      <MenuList>
        <MenuItem onClick={() => download(false)}>Standard JSON input</MenuItem>
        <MenuItem isDisabled={!build.output} onClick={() => download(true)}>
          Compiler output JSON
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
