import { BigNumber, providers, Signer } from 'ethers';
import { PurchaseParams, TokenInfo } from '../types';
export declare class Purchase {
    private purchaseContract;
    private networkID;
    private provider;
    private signer;
    private SWASH_TOKEN;
    constructor(networkID: string, provider: providers.BaseProvider, signer: Signer);
    private getTokenOut;
    getToken(tokenName: string): Promise<TokenInfo>;
    private needToBeApproved;
    approve(tokenInfo: TokenInfo, account: string | null | undefined): Promise<any>;
    getRoutePath(tokenInfo: TokenInfo, priceInDollar: number): Promise<Array<string>>;
    estimateGas(params: PurchaseParams, tokenInfo: TokenInfo, routePath: string[]): Promise<any>;
    request(params: PurchaseParams, tokenInfo: TokenInfo, routePath: string[], gasLimit: BigNumber): Promise<any>;
}
