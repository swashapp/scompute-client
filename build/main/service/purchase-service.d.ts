import { BigNumber, providers, Signer } from 'ethers';
import { PurchaseParams, TokenInfo } from '../types';
export declare class Purchase {
    private purchaseContract;
    private networkID;
    private provider;
    private signer;
    private SWASH_TOKEN;
    constructor(networkID: string, provider: providers.BaseProvider, signer: Signer);
    getToken(tokenName: string): Promise<TokenInfo>;
    private needToBeApproved;
    approve(token: TokenInfo, account: string | null | undefined): Promise<any>;
    getRoutePath(token: TokenInfo, priceInDollar: number): Promise<Array<string>>;
    estimateGas(params: PurchaseParams, token: TokenInfo, routePath: string[]): Promise<any>;
    request(params: PurchaseParams, token: TokenInfo, routePath: string[], gasLimit: BigNumber): Promise<any>;
}
