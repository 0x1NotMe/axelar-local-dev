// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { IERC4626 } from "./IERC4626.sol";
import { IAxelarExecutable } from '@axelar-network/axelar-cgp-solidity/src/interfaces/IAxelarExecutable.sol';
import { AxelarGasReceiver } from '@axelar-network/axelar-cgp-solidity/src/util/AxelarGasReceiver.sol';

contract SampleStrategy is IAxelarExecutable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public vault;
    IERC20 public want;
    string public state;

    string public value;
    string public sourceChain;
    string public sourceAddress;
    AxelarGasReceiver gasReceiver;
    mapping(string => string) public siblings;
    constructor (address _vault, address asset, address _gateway, address _gasReceiver) IAxelarExecutable(_gateway) {
        gasReceiver = AxelarGasReceiver(_gasReceiver);
        vault = _vault;
        if (_vault != address(0)) {
            want = IERC20(IERC4626(vault).asset());
            want.safeApprove(vault, type(uint256).max-1);
        } else {
            want = IERC20(asset);
        }
            
    }

    function name() external pure returns (string memory) {
        return "StrategyUniswapDAI/USDC";
    }

    function withdraw(uint256 _amountNeeded) external {
        require(msg.sender == address(vault), "!vault");
        want.transfer(msg.sender, _amountNeeded);
    }

    //Call this function on setup to tell this contract who it's sibling contracts are.
    function addSibling(string calldata chain_, string calldata address_) external {
        siblings[chain_] = address_;
    }

    //Call this function to update the value of this contract along with all its siblings'.
    function set(
        string memory chain,
        string calldata value_
    ) external payable {
        value = value_;
        gasReceiver.receiveGasNativeAndCallRemote{ value: msg.value }(
            chain,
            siblings[chain],
            abi.encode(value_)
        );
    }

    /*Handles calls created by setAndSend. Updates this contract's value 
    and gives the token received to the destination specified at the source chain. */
    function _execute(
        string memory sourceChain_,
        string memory sourceAddress_, 
        bytes calldata payload_
    ) internal override {
        (value) = abi.decode(payload_, (string));
        sourceChain = sourceChain_;
        sourceAddress = sourceAddress_;
    }
}