// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Adapts an existing Base ERC-20 to LayerZero's OFT standard.
contract RobinOFTAdapter is OFTAdapter {
    constructor(
        address token_,
        address endpoint_,
        address delegate_
    ) OFTAdapter(token_, endpoint_, delegate_) Ownable(delegate_) {}
}
