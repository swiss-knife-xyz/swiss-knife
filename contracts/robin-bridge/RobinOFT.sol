// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Mint/burn representation of a Base token on Robinhood Chain.
contract RobinOFT is OFT {
    constructor(
        string memory name_,
        string memory symbol_,
        address endpoint_,
        address delegate_
    ) OFT(name_, symbol_, endpoint_, delegate_) Ownable(delegate_) {}
}
