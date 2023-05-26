/// <reference types="node" />
import { Blob } from 'buffer';
import { Token } from '@uniswap/sdk-core';
import { providers } from 'ethers';
import Web3 from 'web3';
export interface TokenInfo {
    token: Token;
    isNative: boolean;
    isSwash: boolean;
    baseTokenDecimals: number;
}
export interface PurchaseToken {
    tokenName: string;
    tokenAddress: string;
    isNative: boolean;
    routePath: string[];
}
export interface PurchaseConfig {
    tokenName: string;
    networkID: string;
}
export declare enum PipelineExecutionStatus {
    DRAFT = "Draft",
    PENDING = "Pending",
    CANCELED = "Canceled",
    EXECUTING = "Executing",
    FAILED = "Failed",
    STOPPED = "Stopped",
    STOPPING = "Stopping",
    SUCCEEDED = "Succeeded"
}
export interface ExecutionStep {
    name: string;
    start: Date;
    end: Date;
    status: PipelineExecutionStatus | string;
    reason: string;
}
export interface ExecutionDetails {
    id: string;
    status: PipelineExecutionStatus | string;
    reason: string;
    start: Date;
    created: Date;
}
export interface FileObject {
    name: string;
    modDate?: Date;
    size?: number;
    isDir?: boolean;
}
export interface AuthSessionConfig {
    token?: string;
    onExpired?: () => void;
}
export interface AuthWalletConfig {
    privateKey: string;
    provider: providers.BaseProvider;
    session?: AuthSessionConfig;
}
export interface AuthWeb3Config {
    web3: Web3;
    session?: AuthSessionConfig;
}
export interface sComputeClientOptions {
    host?: string;
    apiVersion?: string;
    servicesHost?: string;
    servicesApiVersion?: string;
    servicesApiPrefix?: string;
}
export interface PipelineInit {
    processingFile: string;
    evaluationFile: string;
    framework: string;
    algorithm: string;
    hyperParameters: {
        [key: string]: string;
    };
}
export interface PipelineDetails {
    name: string;
    creationTime?: Date;
    lastModifiedTime?: Date;
    lastExecutionTime?: Date;
}
export interface ExecutionFn {
    get: () => Promise<ExecutionDetails>;
    getSteps: () => Promise<ExecutionStep[]>;
    stop: () => Promise<void>;
    retry: () => Promise<void>;
    delete: () => Promise<void>;
    downloadModel: () => Promise<Blob>;
    downloadLog: () => Promise<Blob>;
}
export interface PipelineFn {
    execution: (executionId: string) => ExecutionFn;
    get: () => Promise<PipelineDetails>;
    create: (props: PipelineInit) => Promise<void>;
    delete: () => Promise<void>;
    getExecutions: () => Promise<ExecutionDetails[]>;
    start: (inputDataFile: string, purchaseConfig: PurchaseConfig) => Promise<void>;
}
export interface CodeFileFn {
    upload: (file: File | Buffer) => Promise<unknown>;
    delete: () => Promise<unknown>;
    download: () => Promise<Blob>;
}
export interface CODE {
    getAll: () => Promise<FileObject[]>;
    with: (name: string) => CodeFileFn;
}
export interface DATA {
    getAll: () => Promise<FileObject[]>;
}
export interface sComputeFile {
    code: CODE;
    data: DATA;
}
export interface sComputePipeline {
    getAll: () => Promise<PipelineDetails[]>;
    with: (name: string) => PipelineFn;
}
export interface SignatureOBJ {
    address: string;
    signature: string;
    nonce: number;
}
export interface PurchaseParams {
    id: string;
    requestHash: string;
    signature: string;
    time: string;
    productType: string;
    priceInDollar: number;
    signer: string;
}
