import { sComputeFile, sComputePipeline, sComputeClientOptions, AuthWeb3Config, AuthWalletConfig, SignatureOBJ } from './types';
export declare class sComputeClient {
    private request;
    constructor(config: {
        auth: AuthWeb3Config | AuthWalletConfig;
        options?: sComputeClientOptions;
    });
    getSignature(): Promise<SignatureOBJ>;
    files: sComputeFile;
    pipeline: sComputePipeline;
}
