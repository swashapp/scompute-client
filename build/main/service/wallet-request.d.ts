import { providers, Signer } from 'ethers';
import { AuthWalletConfig, sComputeClientOptions, SignatureOBJ } from '../types';
import { Request } from './request-service';
export declare class WalletRequest extends Request {
    private config;
    private wallet;
    private provider;
    constructor(config: AuthWalletConfig, options: sComputeClientOptions);
    getSignatureObj(): Promise<SignatureOBJ>;
    getProvider(): providers.BaseProvider;
    getSigner(): Signer;
    getAccount(): Promise<string>;
}
