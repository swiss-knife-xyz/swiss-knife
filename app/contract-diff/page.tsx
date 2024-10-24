"use client";

import { useEffect, useState } from "react";
import { parseAsString, useQueryState } from "next-usequerystate";
import { Heading, Table, Tbody, Tr, Td, Select, Button, Collapse } from "@chakra-ui/react";
import { Layout } from "@/components/Layout";
import { InputField } from "@/components/InputField";
import { Label } from "@/components/Label";
import { c } from "@/data/common";
import { Chain, mainnet, base } from "viem/chains";
import { diffLines } from 'diff';
import { useSearchParams } from "next/navigation";

const WETH_MAINNET = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const WETH_BASE_MAINNET = '0x4200000000000000000000000000000000000006'

const SUPPORTED_NETWORKS = [
  'mainnet',
  'base'
]

function getEtherscanApiUrl(chain: Chain): string | undefined {
  switch (chain) {
    case mainnet:
      return `https://api.etherscan.io/api?apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`
    case base:
      return `https://api.basescan.org/api?apikey=${process.env.NEXT_PUBLIC_BASESCAN_API_KEY}`
    default:
      return undefined
  }
}

interface SourceCode {
  sources: Record<string, { content: string }>
}

interface ContractResult {
  SourceCode: string
  ContractName: string
}

interface ContractResponse {
  status: string
  message: string
  result: ContractResult[]
}

async function getSourceCode(chain: Chain, address: string): Promise<Record<string, string>> {
  const apiUrl = getEtherscanApiUrl(chain)
  const res = await fetch(`${apiUrl}&module=contract&action=getsourcecode&address=${address}`)
  const data: ContractResponse = await res.json()
  const { SourceCode, ContractName } = data.result[0]
  const isMultiple = SourceCode.startsWith('{')
  if (isMultiple) {
    const { sources } = JSON.parse(
      SourceCode.substring(1, SourceCode.length - 1)) as SourceCode
    return Object.keys(sources).reduce((acc, key) => (
      { ...acc, [key]: sources[key].content }
    ), {})
  }
  else {
    return { [ContractName]: SourceCode }
  }
}

function getColoredOutput(sourceCodes: Record<string, string>[]): Record<string, JSX.Element[]> {
  if (sourceCodes.length < 2) return {}

  const contracts = Object.keys(sourceCodes[0])
  return contracts.map((contract) => {
    const diff = diffLines(sourceCodes[0][contract], sourceCodes[1][contract] || '');
    const html = diff.map((part) => {
      const color = part.added ? { backgroundColor: '#2a3825' } :
        part.removed ? { backgroundColor: '#3c2626' } : {
          backgroundColor: '#1e1e1e'
        }
      return <pre style={color}>{part.value}</pre>
    })
    return { [contract]: html }
  }).reduce((acc, obj) => ({ ...acc, ...obj }), {})
}

const DetermineContractDiff = () => {
  const searchParams = useSearchParams();
  const contract1Url = searchParams.get("contract1");
  const contract2Url = searchParams.get("contract2");
  const network1Url = searchParams.get("network1");
  const network2Url = searchParams.get("network2");
  const [contracts, setContracts] = useState<string[]>([
    contract1Url || WETH_MAINNET,
    contract2Url || WETH_BASE_MAINNET
  ]);
  const network1 = network1Url ? c[network1Url] : mainnet
  const network2 = network2Url ? c[network2Url] : base
  const [networks, setNetworks] = useState<Chain[]>([network1, network2]);
  const [sourceCodes, setSourceCodes] = useState<Record<string, string>[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const diffContracts = async () => {
    const sourceCodes = await Promise.all(networks.map((network, i) => getSourceCode(network, contracts[i])))
    setSourceCodes(sourceCodes)
  }

  const sourceCodesDiff = getColoredOutput(sourceCodes)

  useEffect(() => {
    diffContracts()
  }, [])

  return (
    <Layout>
      <Heading color={"custom.pale"}>Contract Diff</Heading>
      <Table mt={"3rem"} variant={"unstyled"} style={{ width: 'calc(100vw - 400px)' }}>
        <Tbody>
          <Tr>
            <Label>Contract 1</Label>
            <Label>Contract 2</Label>
          </Tr>
          <Tr>
            <Td>
              <InputField
                autoFocus
                placeholder="address"
                value={contracts[0]}
                onChange={(e) => {
                  setContracts([e.target.value, contracts[1]]);
                }}
              />
            </Td>
            <Td>
              <InputField
                autoFocus
                placeholder="address"
                value={contracts[1]}
                onChange={(e) => {
                  setContracts([contracts[0], e.target.value]);
                }}
              />
            </Td>
          </Tr>
          <Tr>
            <Td>
              <Select
                placeholder={networks[0].name}
                value={networks[0].name}
                onChange={(e) => {
                  setNetworks([c[e.target.value], networks[1]]);
                }}
              >
                {
                  SUPPORTED_NETWORKS.map((supportedNetwork) => {
                    return <option key={supportedNetwork} value={supportedNetwork}>{c[supportedNetwork].name}</option>
                  })
                }
              </Select>
            </Td>
            <Td>
              <Select
                placeholder={networks[1].name}
                value={networks[1].name}
                onChange={(e) => {
                  setNetworks([networks[0], c[e.target.value]]);
                }}
              >
                {
                  SUPPORTED_NETWORKS.map((supportedNetwork) => {
                    return <option key={supportedNetwork} value={supportedNetwork}>{c[supportedNetwork].name}</option>
                  })
                }
              </Select>
            </Td>
          </Tr>
          <Tr style={{ display: 'flex', alignItems: 'center' }}>
            <Td>
              <Button onClick={diffContracts}>
                {"Contract Diff"}
              </Button>
            </Td>
          </Tr>
          <Tr>
            <Td colSpan={2} maxWidth={1}>
              {
                Object.keys(sourceCodesDiff).map((contract, i) => {
                  const isOpen = open[contract] || sourceCodesDiff[contract].length > 1
                  return (
                    <div key={i}>
                      <label onClick={() => setOpen({ ...open, [contract]: !!!open[contract] })}>{isOpen ? '▾' : '▸'} {contract}</label>
                      <Collapse in={isOpen} animateOpacity>
                        <div>{sourceCodesDiff[contract]}</div>
                      </Collapse>
                    </div>
                  )
                })
              }
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </Layout>
  );
};

export default DetermineContractDiff;
