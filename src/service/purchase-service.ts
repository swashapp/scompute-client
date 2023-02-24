import { Contract } from '@ethersproject/contracts';
import { parseEther } from '@ethersproject/units';
import { Protocol } from '@uniswap/router-sdk';
import { Token, TradeType } from '@uniswap/sdk-core';

import { providers, Signer } from 'ethers';
import {
  AlphaRouter,
  CurrencyAmount,
  WRAPPED_NATIVE_CURRENCY,
} from 'swash-order-router';

import { SwapRoute } from 'swash-order-router/build/main/routers/router';

import { ERC20_ABI } from '../constants/erc20-abi';
import { PURCHASE_ABI } from '../constants/purchase-abi';
import {
  PURCHASE_CONTRACT_ADDRESS,
  SWASH_TOKEN_ADDRESS,
} from '../constants/purchase-config';
import { PurchaseParams, TokenInfo } from '../types';

export class Purchase {
  private purchaseContract: Contract;
  private networkID: string;
  private provider: providers.BaseProvider;
  private signer: Signer;

  private SWASH_TOKEN: Token;

  constructor(
    networkID: string,
    provider: providers.BaseProvider,
    signer: Signer,
  ) {
    this.networkID = networkID;
    this.provider = provider;
    this.signer = signer;
    this.purchaseContract = new Contract(
      PURCHASE_CONTRACT_ADDRESS[networkID],
      PURCHASE_ABI,
      signer,
    );
    this.SWASH_TOKEN = new Token(
      Number(this.networkID),
      SWASH_TOKEN_ADDRESS[this.networkID],
      18,
      'SWASH',
      'SWASH',
    );
  }

  public async getToken(tokenName: string): Promise<TokenInfo> {
    const tokenMap = await this.purchaseContract.tokenMap(tokenName);
    const tokenAddress = tokenMap[1];
    const isSwash =
      tokenAddress?.toLowerCase() ===
      SWASH_TOKEN_ADDRESS[this.networkID].toLowerCase();
    return {
      tokenName: tokenMap[0],
      tokenAddress,
      isNative: tokenMap[2],
      isSwash,
    };
  }

  private async needToBeApproved(
    token: TokenInfo,
    account: string | null | undefined,
  ): Promise<boolean> {
    const tokenContract = new Contract(
      token.tokenAddress,
      ERC20_ABI,
      this.signer,
    );
    const allowance = await tokenContract.allowance(
      account,
      PURCHASE_CONTRACT_ADDRESS[this.networkID],
    );
    const ethAllowance = parseEther(allowance.toString());
    return ethAllowance.lte(0);
  }

  public async approve(
    token: TokenInfo,
    account: string | null | undefined,
  ): Promise<any> {
    if (!token.isNative) {
      const needToBeApproved = await this.needToBeApproved(token, account);
      if (needToBeApproved) {
        const tokenContract = new Contract(
          token.tokenAddress,
          ERC20_ABI,
          this.signer,
        );
        const tx = await tokenContract.approve(
          PURCHASE_CONTRACT_ADDRESS[this.networkID],
          parseEther('999999999999'),
        );
        if (tx) await tx.wait();
        else throw Error('Failed to approve');
      }
    }
  }

  private async getRoutePath(
    token: TokenInfo,
    priceInDoller: number,
  ): Promise<Array<string>> {
    const priceInSwash = await this.purchaseContract.priceInSwash(
      parseEther(priceInDoller.toString()),
    );
    if (token.isSwash) {
      return [token.tokenAddress, token.tokenAddress];
    }
    let tokenOut = null;

    if (token.isNative) {
      tokenOut = WRAPPED_NATIVE_CURRENCY[Number(this.networkID)];
    } else {
      const tokenContract = new Contract(
        token.tokenAddress,
        ERC20_ABI,
        this.provider,
      );

      const tokenSymbol = await tokenContract.symbol();
      const tokenDecimals = await tokenContract.decimals();
      const tokenName = await tokenContract.name();

      tokenOut = new Token(
        Number(this.networkID),
        token.tokenAddress,
        Number(tokenDecimals.toString()),
        tokenSymbol,
        tokenName,
      );
    }
    const alphaRouter = new AlphaRouter({
      chainId: Number(this.networkID),
      provider: this.provider,
    });

    const paths: Array<string> = [];
    const amount = CurrencyAmount.fromRawAmount(this.SWASH_TOKEN, priceInSwash);

    // debugger
    const routeResult: SwapRoute | null = await alphaRouter.route(
      amount,
      tokenOut,
      TradeType.EXACT_OUTPUT,
      undefined,
      { protocols: [Protocol.V2] },
    );

    if (routeResult != null) {
      for (const routeToken of routeResult.route[0].tokenPath) {
        paths.push(routeToken.address);
      }
    }
    return paths;
  }

  public async request(params: PurchaseParams, token: TokenInfo): Promise<any> {
    const routePath = await this.getRoutePath(token, params.price);
    if (token.isNative) {
      return await this.purchaseContract.buyDataProductWithUniswapEth(
        {
          requestHash: params.requestHash,
          time: params.time,
          price: parseEther(params.price.toString()),
          productType: params.productType,
        },
        params.signature,
        params.signer,
        routePath,
        { gasLimit: 5000000 },
      );
    } else {
      return await this.purchaseContract.buyDataProductWithUniswapErc20(
        {
          requestHash: params.requestHash,
          time: params.time,
          price: parseEther(params.price.toString()),
          productType: params.productType,
        },
        params.signature,
        params.signer,
        token.tokenName,
        routePath,
        { gasLimit: 5000000 },
      );
    }
  }
}
