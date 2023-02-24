"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Purchase = void 0;
const contracts_1 = require("@ethersproject/contracts");
const units_1 = require("@ethersproject/units");
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const swash_order_router_1 = require("swash-order-router");
const erc20_abi_1 = require("../constants/erc20-abi");
const purchase_abi_1 = require("../constants/purchase-abi");
const purchase_config_1 = require("../constants/purchase-config");
class Purchase {
    constructor(networkID, provider, signer) {
        this.networkID = networkID;
        this.provider = provider;
        this.signer = signer;
        this.purchaseContract = new contracts_1.Contract(purchase_config_1.PURCHASE_CONTRACT_ADDRESS[networkID], purchase_abi_1.PURCHASE_ABI, signer);
        this.SWASH_TOKEN = new sdk_core_1.Token(Number(this.networkID), purchase_config_1.SWASH_TOKEN_ADDRESS[this.networkID], 18, 'SWASH', 'SWASH');
    }
    async getToken(tokenName) {
        const tokenMap = await this.purchaseContract.tokenMap(tokenName);
        const tokenAddress = tokenMap[1];
        const isSwash = tokenAddress?.toLowerCase() ===
            purchase_config_1.SWASH_TOKEN_ADDRESS[this.networkID].toLowerCase();
        return {
            tokenName: tokenMap[0],
            tokenAddress,
            isNative: tokenMap[2],
            isSwash,
        };
    }
    async needToBeApproved(token, account) {
        const tokenContract = new contracts_1.Contract(token.tokenAddress, erc20_abi_1.ERC20_ABI, this.signer);
        const allowance = await tokenContract.allowance(account, purchase_config_1.PURCHASE_CONTRACT_ADDRESS[this.networkID]);
        const ethAllowance = (0, units_1.parseEther)(allowance.toString());
        return ethAllowance.lte(0);
    }
    async approve(token, account) {
        if (!token.isNative) {
            const needToBeApproved = await this.needToBeApproved(token, account);
            if (needToBeApproved) {
                const tokenContract = new contracts_1.Contract(token.tokenAddress, erc20_abi_1.ERC20_ABI, this.signer);
                const tx = await tokenContract.approve(purchase_config_1.PURCHASE_CONTRACT_ADDRESS[this.networkID], (0, units_1.parseEther)('999999999999'));
                if (tx)
                    await tx.wait();
                else
                    throw Error('Failed to approve');
            }
        }
    }
    async getRoutePath(token, priceInDoller) {
        const priceInSwash = await this.purchaseContract.priceInSwash((0, units_1.parseEther)(priceInDoller.toString()));
        if (token.isSwash) {
            return [token.tokenAddress, token.tokenAddress];
        }
        let tokenOut = null;
        if (token.isNative) {
            tokenOut = swash_order_router_1.WRAPPED_NATIVE_CURRENCY[Number(this.networkID)];
        }
        else {
            const tokenContract = new contracts_1.Contract(token.tokenAddress, erc20_abi_1.ERC20_ABI, this.provider);
            const tokenSymbol = await tokenContract.symbol();
            const tokenDecimals = await tokenContract.decimals();
            const tokenName = await tokenContract.name();
            tokenOut = new sdk_core_1.Token(Number(this.networkID), token.tokenAddress, Number(tokenDecimals.toString()), tokenSymbol, tokenName);
        }
        const alphaRouter = new swash_order_router_1.AlphaRouter({
            chainId: Number(this.networkID),
            provider: this.provider,
        });
        const paths = [];
        const amount = swash_order_router_1.CurrencyAmount.fromRawAmount(this.SWASH_TOKEN, priceInSwash);
        const routeResult = await alphaRouter.route(amount, tokenOut, sdk_core_1.TradeType.EXACT_OUTPUT, undefined, { protocols: [router_sdk_1.Protocol.V2] });
        if (routeResult != null) {
            for (const routeToken of routeResult.route[0].tokenPath) {
                paths.push(routeToken.address);
            }
        }
        return paths;
    }
    async request(params, token) {
        const routePath = await this.getRoutePath(token, params.price);
        if (token.isNative) {
            return await this.purchaseContract.buyDataProductWithUniswapEth({
                requestHash: params.requestHash,
                time: params.time,
                price: (0, units_1.parseEther)(params.price.toString()),
                productType: params.productType,
            }, params.signature, params.signer, routePath, { gasLimit: 5000000 });
        }
        else {
            return await this.purchaseContract.buyDataProductWithUniswapErc20({
                requestHash: params.requestHash,
                time: params.time,
                price: (0, units_1.parseEther)(params.price.toString()),
                productType: params.productType,
            }, params.signature, params.signer, token.tokenName, routePath, { gasLimit: 5000000 });
        }
    }
}
exports.Purchase = Purchase;
//# sourceMappingURL=purchase-service.js.map