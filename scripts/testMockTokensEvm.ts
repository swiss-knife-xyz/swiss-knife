// Offline EVM fixture: no RPC, keys, signatures or real deployments.
// Install @ethereumjs/evm@10.1.0 + @ethereumjs/util@10.1.0 in a private tool dir;
// MOCK_EVM_PACKAGE_JSON=/absolute/tool/package.json tsx scripts/testMockTokensEvm.ts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Interface } from "ethers";
import { buildMockDeployment } from "../lib/mockTokens";
const requireEvm = createRequire(
  process.env.MOCK_EVM_PACKAGE_JSON ?? import.meta.url
);
const { createEVM } = requireEvm("@ethereumjs/evm");
const { Common, Mainnet, Hardfork } = requireEvm("@ethereumjs/common");
const { createAddressFromString, hexToBytes, bytesToHex } =
  requireEvm("@ethereumjs/util");
const deployer = "0x1111111111111111111111111111111111111111";
const stranger = "0x2222222222222222222222222222222222222222";
const recipient = "0x3333333333333333333333333333333333333333";
const zero = "0x0000000000000000000000000000000000000000";
async function main() {
  const summary = [];
  for (const hardfork of [Hardfork.Paris, Hardfork.Prague]) {
    const evm = await createEVM({
      common: new Common({ chain: Mainnet, hardfork }),
    });
    for (const standard of ["ERC20", "ERC721", "ERC1155"]) {
      const deployment = buildMockDeployment({
        standard,
        chainId: "11155111",
        name: "Fixture",
        symbol: "FX",
        initialSupply: "9007199254740993.000000000000000001",
        recipient,
        uri: standard === "ERC721" ? "ipfs://mock/" : "ipfs://mock/{id}.json",
      });
      const iface = new Interface(deployment.artifact.abi);
      const creation = await evm.runCall({
        caller: createAddressFromString(deployer),
        data: hexToBytes(deployment.data),
        gasLimit: 15000000n,
      });
      assert.equal(
        creation.execResult.exceptionError,
        undefined,
        `create ${standard}/${hardfork}`
      );
      const to = creation.createdAddress;
      assert.ok(to);
      assert.equal(
        bytesToHex(await evm.stateManager.getCode(to)),
        deployment.artifact.deployedBytecode
      );
      async function call(
        fn: string,
        args: unknown[] = [],
        sender = stranger,
        reverts = false
      ) {
        const result = await evm.runCall({
          caller: createAddressFromString(sender),
          to,
          data: hexToBytes(iface.encodeFunctionData(fn, args)),
          gasLimit: 2000000n,
        });
        if (reverts) {
          assert.ok(result.execResult.exceptionError, `${fn} must revert`);
          return;
        }
        assert.equal(result.execResult.exceptionError, undefined, fn);
        if (iface.getFunction(fn)!.outputs.length)
          return iface.decodeFunctionResult(
            fn,
            bytesToHex(result.execResult.returnValue)
          );
      }
      assert.equal((await call("name"))![0], "Fixture");
      assert.equal((await call("symbol"))![0], "FX");
      if (standard === "ERC20") {
        const initial = 9007199254740993000000000000000001n;
        assert.equal((await call("decimals"))![0], 18n);
        assert.equal((await call("totalSupply"))![0], initial);
        assert.equal((await call("balanceOf", [recipient]))![0], initial);
        await call("mint", [recipient, 123n]);
        assert.equal((await call("totalSupply"))![0], initial + 123n);
        await call("transfer", [stranger, 20n], recipient);
        assert.equal((await call("balanceOf", [stranger]))![0], 20n);
        await call("approve", [deployer, 7n], recipient);
        await call("transferFrom", [recipient, stranger, 7n], deployer);
        assert.equal((await call("balanceOf", [stranger]))![0], 27n);
        await call("mint", [zero, 1n], stranger, true);
      } else if (standard === "ERC721") {
        assert.equal(
          (await call("supportsInterface", ["0x80ac58cd"]))![0],
          true
        );
        assert.equal(
          (await call("supportsInterface", ["0x5b5e139f"]))![0],
          true
        );
        const id = 9007199254740993n;
        await call("mint", [recipient, id]);
        assert.equal(
          (await call("ownerOf", [id]))![0].toLowerCase(),
          recipient
        );
        assert.equal((await call("tokenURI", [id]))![0], `ipfs://mock/${id}`);
        await call("mint", [stranger, id], stranger, true);
        await call("mint", [zero, 1n], stranger, true);
        await call("transferFrom", [recipient, stranger, id], recipient);
        assert.equal((await call("ownerOf", [id]))![0].toLowerCase(), stranger);
        // Safe-mint to a deployed nonreceiver must fail without assigning a token.
        await call("mint", [to.toString(), 2n], stranger, true);
      } else {
        assert.equal(
          (await call("supportsInterface", ["0xd9b67a26"]))![0],
          true
        );
        assert.equal(
          (await call("supportsInterface", ["0x0e89341c"]))![0],
          true
        );
        await call("mint", [recipient, 42n, 19n, "0x"]);
        await call("mint", [recipient, 42n, 2n, "0x"]);
        assert.equal((await call("balanceOf", [recipient, 42n]))![0], 21n);
        assert.equal((await call("uri", [42n]))![0], "ipfs://mock/{id}.json");
        await call(
          "safeTransferFrom",
          [recipient, stranger, 42n, 3n, "0x"],
          recipient
        );
        assert.equal((await call("balanceOf", [stranger, 42n]))![0], 3n);
        await call("mint", [zero, 42n, 1n, "0x"], stranger, true);
        await call("mint", [to.toString(), 2n, 1n, "0x"], stranger, true);
      }
      summary.push({
        standard,
        hardfork,
        constructorGas: creation.execResult.executionGasUsed.toString(),
        runtimeMatchesArtifact: true,
        permissionlessMint: true,
        transfers: true,
        zeroRecipientReverts: true,
      });
    }
  }
  console.log(
    JSON.stringify({ offlineOnly: true, fixtures: summary }, null, 2)
  );
}
main().catch((error) => {
  console.error("Offline mock token EVM fixture failed", error);
  process.exitCode = 1;
});
