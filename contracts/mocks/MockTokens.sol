// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/// @notice MOCK ONLY. Anyone can mint to anyone, including on mainnet.
/// No owner, cap, backing, economic value or privileged mint role.
contract MockERC20 is ERC20 {
    constructor(string memory label, string memory ticker, address recipient, uint256 initialSupply)
        ERC20(label, ticker)
    {
        if (initialSupply > 0) _mint(recipient, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @notice MOCK ONLY. Anyone can mint any unused ID to anyone.
contract MockERC721 is ERC721 {
    string private _mockBaseURI;

    constructor(string memory label, string memory ticker, string memory baseURI)
        ERC721(label, ticker)
    {
        _mockBaseURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _mockBaseURI;
    }

    function mint(address to, uint256 tokenId) external {
        _safeMint(to, tokenId);
    }
}

/// @notice MOCK ONLY. Anyone can mint any ID and quantity to anyone.
/// Metadata URLs are immutable; hosted content may still change.
contract MockERC1155 is ERC1155 {
    string public name;
    string public symbol;

    constructor(string memory label, string memory ticker, string memory uriTemplate) ERC1155(uriTemplate) {
        name = label;
        symbol = ticker;
    }

    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external {
        _mint(to, id, amount, data);
    }
}
