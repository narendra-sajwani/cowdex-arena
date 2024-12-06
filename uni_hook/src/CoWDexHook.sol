// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {BaseHook} from "v4-periphery/src/base/hooks/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";
import {BeforeSwapDelta, toBeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {BalanceDelta, BalanceDeltaLibrary} from "v4-core/types/BalanceDelta.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";

interface ICoWDexServiceManager {
    function createNewTask(
        address sender,
        int256 amountSpecified,
        bool zeroForOne,
        uint160 sqrtPriceX96,
        bytes32 poolId
    ) external;
}

contract CoWDexHook is BaseHook {
    using CurrencyLibrary for Currency;
    using BalanceDeltaLibrary for BalanceDelta;
    using CurrencySettler for Currency;

    mapping(bytes32 poolId => PoolKey key) public poolIdToKey;
    address public cowDexServiceManager;

    constructor(
        IPoolManager poolManager,
        address _cowDExServiceManager
    ) BaseHook(poolManager) {
        cowDexServiceManager = _cowDExServiceManager;
    }

    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true, // Override how swaps are done
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: true, // Allow beforeSwap to return a custom delta
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    function beforeSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    )
        external
        override
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        // TODO
        // no hook data just return
        BeforeSwapDelta beforeSwapDelta;
        if (hookData.length == 0) {
            beforeSwapDelta = toBeforeSwapDelta(0, 0);
            return (this.beforeSwap.selector, beforeSwapDelta, 0);
        }

        // decode the hook data
        (bool toCowMatch, address sender) = abi.decode(
            hookData,
            (bool, address)
        );

        if (!toCowMatch || params.amountSpecified > 0) {
            beforeSwapDelta = toBeforeSwapDelta(0, 0);
            return (this.beforeSwap.selector, beforeSwapDelta, 0);
        }

        if (sender == address(0)) {
            beforeSwapDelta = toBeforeSwapDelta(0, 0);
            return (this.beforeSwap.selector, beforeSwapDelta, 0);
        }
    }
}
