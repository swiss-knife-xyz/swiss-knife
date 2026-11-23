"use client";

import { useMemo, useState } from "react";
import { DarkSelect, type DarkSelectProps } from "./DarkSelect";
import {
  getNetworkOptions,
  chainIdToChain,
  type NetworkIdentity,
} from "@/data/networks";
import type { GroupBase } from "chakra-react-select";
import { Button, HStack } from "@chakra-ui/react";
import { Plus, Settings2 } from "lucide-react";
import { CustomChainModal } from "./CustomChainModal";
import { useCustomChains } from "@/lib/customChains/store";
import type { SelectedOption, SelectedOptionState } from "@/types";

type PresentationProps = Omit<
  DarkSelectProps,
  "options" | "selectedOption" | "setSelectedOption"
> & {
  networks?: readonly (number | NetworkIdentity)[];
  options?: DarkSelectProps["options"];
};
type ControlledProps = {
  chainId: number | null | undefined;
  onChange: (chainId: number) => void;
  selectedOption?: never;
  setSelectedOption?: never;
};
// Existing URL/form state may store a select option or a provider-specific string.
// Keep that state local without forcing every tool to change its serialization.
type OptionProps = {
  chainId?: never;
  onChange?: never;
  selectedOption: SelectedOptionState;
  setSelectedOption: DarkSelectProps["setSelectedOption"];
};
export type NetworkSelectProps = PresentationProps &
  (ControlledProps | OptionProps);

export function NetworkSelect(props: NetworkSelectProps) {
  const {
    networks,
    options: suppliedOptions,
    chainId,
    onChange,
    selectedOption,
    setSelectedOption,
    ariaLabel = "Network",
    ...presentation
  } = props;
  const saved = useCustomChains();
  const [isModalOpen, setModalOpen] = useState(false);
  const baseOptions = useMemo(() => {
    const entries = suppliedOptions ?? getNetworkOptions(networks);
    // Keep provider-defined groups and their ordering; group standard flat lists.
    if (entries.some((entry) => "options" in entry)) return entries;
    const identities = new Map(
      networks?.flatMap((entry) =>
        typeof entry === "number" ? [] : [[entry.id, entry] as const]
      )
    );
    return [false, true]
      .map((testnet) => ({
        label: testnet ? "Testnets" : "Mainnets",
        options: (entries as readonly SelectedOption[]).filter(
          (option) =>
            Boolean(
              chainIdToChain[Number(option.value)]?.testnet ??
                identities.get(Number(option.value))?.testnet
            ) === testnet
        ),
      }))
      .filter((group) => group.options.length > 0);
  }, [suppliedOptions, networks, saved.revision]);
  const options = useMemo(() => {
    if (!saved.chains.length) return baseOptions;
    const customIds = new Set(saved.chains.map((chain) => String(chain.id)));
    const original: Array<SelectedOption | GroupBase<SelectedOption>> = [];
    for (const option of baseOptions) {
      if ("options" in option) {
        const remaining = option.options.filter(
          (item) => !customIds.has(String(item.value))
        );
        if (remaining.length) original.push({ ...option, options: remaining });
      } else if (!customIds.has(String(option.value))) original.push(option);
    }
    const first = baseOptions.flatMap((option) =>
      "options" in option ? [...option.options] : [option]
    )[0];
    return [
      {
        label: "Custom networks",
        options: saved.chains.map((chain) => ({
          label: chain.name,
          value: typeof first?.value === "string" ? String(chain.id) : chain.id,
        })),
      },
      ...original,
    ];
  }, [baseOptions, saved]);
  const flat = useMemo(
    () =>
      options.flatMap((option) =>
        "options" in option ? [...option.options] : [option as SelectedOption]
      ),
    [options]
  );
  const selected = onChange
    ? (flat.find((option) => Number(option.value) === chainId) ?? null)
    : (flat.find(
        (option) =>
          selectedOption &&
          String(option.value) === String(selectedOption.value)
      ) ??
      selectedOption ??
      null);
  return (
    <>
      <DarkSelect
        {...presentation}
        ariaLabel={ariaLabel}
        menuFooter={(close) => (
          <HStack spacing={0}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              h="44px"
              px={3}
              borderRadius={0}
              color="whiteAlpha.800"
              fontWeight="normal"
              _hover={{ bg: "whiteAlpha.200", color: "white" }}
              _focusVisible={{
                bg: "whiteAlpha.200",
                boxShadow: "inset 0 0 0 2px var(--chakra-colors-blue-400)",
              }}
              flex={1}
              justifyContent="flex-start"
              leftIcon={<Plus size={20} />}
              iconSpacing={3}
              onClick={() => {
                close();
                setModalOpen(true);
              }}
            >
              Add chain
            </Button>
            {saved.chains.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                h="44px"
                px={3}
                borderRadius={0}
                color="whiteAlpha.800"
                fontWeight="normal"
                _hover={{ bg: "whiteAlpha.200", color: "white" }}
                aria-label="Manage saved chains"
                leftIcon={<Settings2 size={14} />}
                onClick={() => {
                  close();
                  setModalOpen(true);
                }}
              >
                Manage
              </Button>
            )}
          </HStack>
        )}
        menuMinWidth={presentation.menuMinWidth ?? 360}
        menuAlign={presentation.menuAlign ?? "right"}
        showOptionValue={presentation.showOptionValue ?? true}
        options={options}
        selectedOption={selected}
        setSelectedOption={(option) => {
          if (onChange) {
            if (option) onChange(Number(option.value));
          } else setSelectedOption?.(option);
        }}
      />
      <CustomChainModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(chain) => {
          if (onChange) onChange(chain.id);
          else
            setSelectedOption?.({
              value:
                typeof selectedOption?.value === "string"
                  ? String(chain.id)
                  : chain.id,
              label: chain.name,
            });
        }}
      />
    </>
  );
}
