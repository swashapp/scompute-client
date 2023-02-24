/// <reference types="node" />
import { providers, Signer } from 'ethers';
import { AuthSessionConfig, sComputeClientOptions, SignatureOBJ } from '../types';
export declare enum URI {
    USER = "user",
    PIPELINE = "pipeline",
    SIGNATURE = "public/signature",
    CODE_FILE = "files/code",
    DATA_FILE = "files/data"
}
export declare function encodeQueryString(params: {
    [key: string]: string | boolean | number;
}): string;
export declare const MESSAGE_TO_SIGN_PREFIX = "I am signing my one-time nonce";
export declare abstract class Request {
    private options?;
    private session?;
    constructor(session?: AuthSessionConfig, options?: sComputeClientOptions);
    private getServerApiURL;
    private getServicesApiURL;
    protected signWith(signMessage: (nonce: number) => Promise<SignatureOBJ>): Promise<SignatureOBJ>;
    abstract getSignatureObj(): Promise<SignatureOBJ>;
    abstract getProvider(): providers.BaseProvider;
    abstract getSigner(): Signer;
    abstract getAccount(): Promise<string>;
    protected createRequest(method?: string): Promise<RequestInit>;
    protected call<Type>(url: string, req: any): Promise<Type>;
    private send;
    GET<Type>(api: string, params?: any): Promise<Type>;
    DELETE<Type>(api: string, params?: any): Promise<Type>;
    POST<Type>(api: string, body?: any): Promise<Type>;
    PUT<Type>(api: string, body?: any): Promise<Type>;
    DOWNLOAD(api: string, params?: any): Promise<any>;
    POSTFile<Type>(api: string, file: File | Buffer, fileName: string): Promise<Type>;
}
