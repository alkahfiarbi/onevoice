// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Minimal stand-in for the Agent ID ERC-721, used ONLY in local tests.
/// It implements just balanceOf/mint so tests can simulate holders and
/// non-holders. It is never deployed to mainnet.
contract MockAgentID {
    mapping(address => uint256) private _balances;

    function mint(address to) external {
        _balances[to] += 1;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }
}
