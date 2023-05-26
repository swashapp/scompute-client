"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Purchase = void 0;
const contracts_1 = require("@ethersproject/contracts");
const units_1 = require("@ethersproject/units");
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const ethers_1 = require("ethers");
const swash_order_router_1 = require("swash-order-router");
const erc20_abi_1 = require("../constants/erc20-abi");
const purchase_abi_1 = require("../constants/purchase-abi");
const purchase_config_1 = require("../constants/purchase-config");
const events_1 = require("../events");
class Purchase {
    constructor(networkID, provider, signer) {
        this.networkID = networkID;
        this.provider = provider;
        this.signer = signer;
        this.purchaseContract = new contracts_1.Contract(purchase_config_1.PURCHASE_CONTRACT_ADDRESS[networkID], purchase_abi_1.PURCHASE_ABI, signer);
        this.SWASH_TOKEN = new sdk_core_1.Token(Number(this.networkID), purchase_config_1.SWASH_TOKEN_ADDRESS[this.networkID], 18, 'SWASH', 'SWASH');
    }
    async getTokenOut(tokenAddress, isNative) {
        let token = null;
        let isSwash = false;
        if (isNative) {
            token = swash_order_router_1.WRAPPED_NATIVE_CURRENCY[Number(this.networkID)];
        }
        else if (tokenAddress.toLowerCase() === this.SWASH_TOKEN.address.toLowerCase()) {
            token = this.SWASH_TOKEN;
            isSwash = true;
        }
        else {
            const tokenContract = new contracts_1.Contract(tokenAddress, erc20_abi_1.ERC20_ABI, this.provider);
            const tokenSymbol = await tokenContract.symbol();
            const tokenDecimals = await tokenContract.decimals();
            const tokenName = await tokenContract.name();
            token = new sdk_core_1.Token(Number(this.networkID), tokenAddress, Number(tokenDecimals.toString()), tokenSymbol, tokenName);
        }
        return {
            token,
            isNative,
            isSwash,
        };
    }
    async getToken(tokenName) {
        const tokenMap = await this.purchaseContract.tokenMap(tokenName);
        const tokenAddress = tokenMap[1];
        const baseTokenAddress = await this.purchaseContract.baseTokenAddress();
        const baseTokenContract = new contracts_1.Contract(baseTokenAddress, erc20_abi_1.ERC20_ABI, this.provider);
        const baseTokenDecimals = await baseTokenContract.decimals();
        const tokenInfo = await this.getTokenOut(tokenAddress, tokenMap[2]);
        return {
            ...tokenInfo,
            baseTokenDecimals,
        };
    }
    async needToBeApproved(token, account) {
        const tokenContract = new contracts_1.Contract(token.address, erc20_abi_1.ERC20_ABI, this.signer);
        const allowance = await tokenContract.allowance(account, purchase_config_1.PURCHASE_CONTRACT_ADDRESS[this.networkID]);
        const ethAllowance = (0, units_1.parseUnits)(allowance.toString(), token.decimals);
        return ethAllowance.lte(0);
    }
    async approve(tokenInfo, account) {
        if (!tokenInfo.isNative) {
            const needToBeApproved = await this.needToBeApproved(tokenInfo.token, account);
            if (needToBeApproved) {
                const tokenContract = new contracts_1.Contract(tokenInfo.token.address, erc20_abi_1.ERC20_ABI, this.signer);
                const tx = await tokenContract.approve(purchase_config_1.PURCHASE_CONTRACT_ADDRESS[this.networkID], (0, units_1.parseUnits)('999999999999', tokenInfo.token.decimals));
                if (tx)
                    await tx.wait();
                else
                    throw Error('Failed to approve');
            }
        }
    }
    async getRoutePath(tokenInfo, priceInDollar) {
        const priceInSwash = await this.purchaseContract.priceInSwash((0, units_1.parseUnits)(priceInDollar.toString(), tokenInfo.baseTokenDecimals));
        if (tokenInfo.isSwash) {
            return [tokenInfo.token.address, tokenInfo.token.address];
        }
        const alphaRouter = new swash_order_router_1.AlphaRouter({
            chainId: Number(this.networkID),
            provider: this.provider,
        });
        const paths = [];
        const amount = swash_order_router_1.CurrencyAmount.fromRawAmount(this.SWASH_TOKEN, priceInSwash);
        const routeResult = await alphaRouter.route(amount, tokenInfo.token, sdk_core_1.TradeType.EXACT_OUTPUT, undefined, { protocols: [router_sdk_1.Protocol.V2] });
        if (routeResult != null) {
            for (const routeToken of routeResult.route[0].tokenPath) {
                paths.push(routeToken.address);
            }
        }
        return paths;
    }
    async estimateGas(params, tokenInfo, routePath) {
        let gas = ethers_1.BigNumber.from(3000000);
        try {
            if (tokenInfo.isNative) {
                gas =
                    await this.purchaseContract.estimateGas.buyDataProductWithUniswapEth({
                        requestHash: params.requestHash,
                        timeStamp: params.time,
                        price: (0, units_1.parseUnits)(params.priceInDollar.toString(), tokenInfo.baseTokenDecimals),
                        productType: params.productType,
                    }, params.signature, params.signer, routePath);
            }
            else {
                gas =
                    await this.purchaseContract.estimateGas.buyDataProductWithUniswapErc20({
                        requestHash: params.requestHash,
                        timeStamp: params.time,
                        price: (0, units_1.parseUnits)(params.priceInDollar.toString(), tokenInfo.baseTokenDecimals),
                        productType: params.productType,
                    }, params.signature, params.signer, tokenInfo.token.name, routePath);
            }
        }
        catch (err) {
            console.log(err);
            events_1.sComputeClientEmitter.emit('warning', err.reason || err.error?.message);
        }
        return gas.mul(120).div(100);
    }
    async request(params, tokenInfo, routePath, gasLimit) {
        if (tokenInfo.isNative) {
            return await this.purchaseContract.buyDataProductWithUniswapEth({
                requestHash: params.requestHash,
                timeStamp: params.time,
                price: (0, units_1.parseUnits)(params.priceInDollar.toString(), tokenInfo.baseTokenDecimals),
                productType: params.productType,
            }, params.signature, params.signer, routePath, { gasLimit });
        }
        else {
            return await this.purchaseContract.buyDataProductWithUniswapErc20({
                requestHash: params.requestHash,
                timeStamp: params.time,
                price: (0, units_1.parseUnits)(params.priceInDollar.toString(), tokenInfo.baseTokenDecimals),
                productType: params.productType,
            }, params.signature, params.signer, tokenInfo.token.name, routePath, { gasLimit });
        }
    }
}
exports.Purchase = Purchase;
//# sourceMappingURL=purchase-service.js.map