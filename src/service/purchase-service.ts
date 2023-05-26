import { Contract } from '@ethersproject/contracts';
import { parseUnits } from '@ethersproject/units';
import { Protocol } from '@uniswap/router-sdk';
import { Token, TradeType } from '@uniswap/sdk-core';

import { BigNumber, providers, Signer } from 'ethers';

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
import { sComputeClientEmitter } from '../events';
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

  private async getTokenOut(
    tokenAddress: string,
    isNative: boolean,
  ): Promise<{ token: Token; isNative: boolean; isSwash: boolean }> {
    let token = null;
    let isSwash = false;

    if (isNative) {
      token = (WRAPPED_NATIVE_CURRENCY as any)[Number(this.networkID)];
    } else if (
      tokenAddress.toLowerCase() === this.SWASH_TOKEN.address.toLowerCase()
    ) {
      token = this.SWASH_TOKEN;
      isSwash = true;
    } else {
      const tokenContract = new Contract(
        tokenAddress,
        ERC20_ABI,
        this.provider,
      );

      const tokenSymbol = await tokenContract.symbol();
      const tokenDecimals = await tokenContract.decimals();
      const tokenName = await tokenContract.name();

      token = new Token(
        Number(this.networkID),
        tokenAddress,
        Number(tokenDecimals.toString()),
        tokenSymbol,
        tokenName,
      );
    }
    return {
      token,
      isNative,
      isSwash,
    };
  }

  public async getToken(tokenName: string): Promise<TokenInfo> {
    const tokenMap = await this.purchaseContract.tokenMap(tokenName);
    const tokenAddress = tokenMap[1];

    const baseTokenAddress = await this.purchaseContract.baseTokenAddress();
    const baseTokenContract = new Contract(
      baseTokenAddress,
      ERC20_ABI,
      this.provider,
    );

    const baseTokenDecimals = await baseTokenContract.decimals();

    const tokenInfo = await this.getTokenOut(tokenAddress, tokenMap[2]);

    return {
      ...tokenInfo,
      baseTokenDecimals,
    };
  }

  private async needToBeApproved(
    token: Token,
    account: string | null | undefined,
  ): Promise<boolean> {
    const tokenContract = new Contract(token.address, ERC20_ABI, this.signer);
    const allowance = await tokenContract.allowance(
      account,
      PURCHASE_CONTRACT_ADDRESS[this.networkID],
    );
    const ethAllowance = parseUnits(allowance.toString(), token.decimals);
    return ethAllowance.lte(0);
  }

  public async approve(
    tokenInfo: TokenInfo,
    account: string | null | undefined,
  ): Promise<any> {
    if (!tokenInfo.isNative) {
      const needToBeApproved = await this.needToBeApproved(
        tokenInfo.token,
        account,
      );
      if (needToBeApproved) {
        const tokenContract = new Contract(
          tokenInfo.token.address,
          ERC20_ABI,
          this.signer,
        );
        const tx = await tokenContract.approve(
          PURCHASE_CONTRACT_ADDRESS[this.networkID],
          parseUnits('999999999999', tokenInfo.token.decimals),
        );
        if (tx) await tx.wait();
        else throw Error('Failed to approve');
      }
    }
  }

  public async getRoutePath(
    tokenInfo: TokenInfo,
    priceInDollar: number,
  ): Promise<Array<string>> {
    const priceInSwash = await this.purchaseContract.priceInSwash(
      parseUnits(priceInDollar.toString(), tokenInfo.baseTokenDecimals),
    );
    if (tokenInfo.isSwash) {
      return [tokenInfo.token.address, tokenInfo.token.address];
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
      tokenInfo.token,
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

  public async estimateGas(
    params: PurchaseParams,
    tokenInfo: TokenInfo,
    routePath: string[],
  ): Promise<any> {
    let gas: BigNumber = BigNumber.from(3000000);
    try {
      if (tokenInfo.isNative) {
        gas =
          await this.purchaseContract.estimateGas.buyDataProductWithUniswapEth(
            {
              requestHash: params.requestHash,
              timeStamp: params.time,
              price: parseUnits(
                params.priceInDollar.toString(),
                tokenInfo.baseTokenDecimals,
              ),
              productType: params.productType,
            },
            params.signature,
            params.signer,
            routePath,
          );
      } else {
        gas =
          await this.purchaseContract.estimateGas.buyDataProductWithUniswapErc20(
            {
              requestHash: params.requestHash,
              timeStamp: params.time,
              price: parseUnits(
                params.priceInDollar.toString(),
                tokenInfo.baseTokenDecimals,
              ),
              productType: params.productType,
            },
            params.signature,
            params.signer,
            tokenInfo.token.name,
            routePath,
          );
      }
    } catch (err) {
      console.log(err);
      sComputeClientEmitter.emit('warning', err.reason || err.error?.message);
    }
    return gas.mul(120).div(100);
  }

  public async request(
    params: PurchaseParams,
    tokenInfo: TokenInfo,
    routePath: string[],
    gasLimit: BigNumber,
  ): Promise<any> {
    if (tokenInfo.isNative) {
      return await this.purchaseContract.buyDataProductWithUniswapEth(
        {
          requestHash: params.requestHash,
          timeStamp: params.time,
          price: parseUnits(
            params.priceInDollar.toString(),
            tokenInfo.baseTokenDecimals,
          ),
          productType: params.productType,
        },
        params.signature,
        params.signer,
        routePath,
        { gasLimit },
      );
    } else {
      return await this.purchaseContract.buyDataProductWithUniswapErc20(
        {
          requestHash: params.requestHash,
          timeStamp: params.time,
          price: parseUnits(
            params.priceInDollar.toString(),
            tokenInfo.baseTokenDecimals,
          ),
          productType: params.productType,
        },
        params.signature,
        params.signer,
        tokenInfo.token.name,
        routePath,
        { gasLimit },
      );
    }
  }
}
