import { Blob } from 'buffer';

import { Web3Request, WalletRequest, Request, URI, Purchase } from './service';
import {
  ExecutionDetails,
  ExecutionFn,
  ExecutionStep,
  FileObject,
  sComputeFile,
  PipelineDetails,
  PipelineFn,
  PipelineInit,
  sComputePipeline,
  sComputeClientOptions,
  AuthWeb3Config,
  AuthWalletConfig,
  PurchaseConfig,
  SignatureOBJ,
  PurchaseParams,
  CodeFileFn,
} from './types';

export class sComputeClient {
  private request: Request;

  constructor(config: {
    auth: AuthWeb3Config | AuthWalletConfig;
    options?: sComputeClientOptions;
  }) {
    const auth: any = config.auth;
    const options = config.options;
    if (auth.web3) this.request = new Web3Request(auth, options);
    else if (auth.privateKey) this.request = new WalletRequest(auth, options);
  }

  public getSignature(): Promise<SignatureOBJ> {
    return this.request.getSignatureObj();
  }

  public files: sComputeFile = {
    code: {
      getAll: (): Promise<FileObject[]> => this.request.GET(URI.CODE_FILE),
      with: (name: string): CodeFileFn => {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const sdk = this;
        return {
          upload: (file: File | Buffer): Promise<unknown> =>
            sdk.request.POSTFile(URI.CODE_FILE, file, name),
          delete: (): Promise<unknown> =>
            sdk.request.DELETE(URI.CODE_FILE, { fileName: name }),
          download: async (): Promise<Blob> => {
            const res = await sdk.request.DOWNLOAD(
              `${URI.CODE_FILE}/download`,
              {
                fileName: name,
              },
            );
            return await res.blob();
          },
        };
      },
    },
    data: {
      getAll: (): Promise<FileObject[]> => this.request.GET(URI.DATA_FILE),
    },
  };

  public pipeline: sComputePipeline = {
    getAll: (): Promise<PipelineDetails[]> =>
      this.request.GET(`${URI.PIPELINE}/list`),
    with: (name: string): PipelineFn => {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const sdk = this;
      return {
        execution: (executionId: string): ExecutionFn => {
          return {
            getSteps: (): Promise<ExecutionStep[]> => {
              return sdk.request.GET<ExecutionStep[]>(`${URI.PIPELINE}/steps`, {
                executionId,
                pipelineName: name,
              });
            },
            stop: (): Promise<void> => {
              return sdk.request.POST(`${URI.PIPELINE}/stop`, {
                pipelineName: name,
                executionId,
              });
            },

            retry: (): Promise<void> => {
              return sdk.request.POST(`${URI.PIPELINE}/retry`, {
                pipelineName: name,
                executionId,
              });
            },

            get: (): Promise<ExecutionDetails> =>
              sdk.request.GET(`${URI.PIPELINE}/execution`, {
                pipelineName: name,
                executionId,
              }),

            downloadModel: async (): Promise<Blob> => {
              const res = await sdk.request.DOWNLOAD(`${URI.PIPELINE}/model`, {
                pipelineName: name,
                executionId,
              });
              return await res.blob();
            },

            downloadLog: async (): Promise<Blob> => {
              const res = await sdk.request.DOWNLOAD(`${URI.PIPELINE}/log`, {
                pipelineName: name,
                executionId,
              });
              return await res.blob();
            },
          };
        },

        get: (): Promise<PipelineDetails> =>
          sdk.request.GET(URI.PIPELINE, { pipelineName: name }),

        create: (props: PipelineInit): Promise<void> => {
          return sdk.request.POST(URI.PIPELINE, {
            pipelineName: name,
            ...props,
            hyperParameters: JSON.stringify(props.hyperParameters),
          });
        },

        delete: (): Promise<void> => {
          return sdk.request.DELETE(URI.PIPELINE, {
            pipelineName: name,
          });
        },

        getExecutions: (): Promise<ExecutionDetails[]> => {
          return sdk.request.GET<ExecutionDetails[]>(
            `${URI.PIPELINE}/execution/list`,
            {
              pipelineName: name,
            },
          );
        },

        start: async (
          inputDataFile: string,
          purchaseConfig: PurchaseConfig,
        ): Promise<void> => {
          const provider = sdk.request.getProvider();
          const signer = sdk.request.getSigner();
          const account = await sdk.request.getAccount();
          const purchase = new Purchase(
            purchaseConfig.networkID,
            provider,
            signer,
          );
          const token = await purchase.getToken(purchaseConfig.tokenName);
          await purchase.approve(token, account);
          return sdk.request
            .POST<PurchaseParams>(`${URI.PIPELINE}/start`, {
              pipelineName: name,
              inputDataFile,
              network: Number(purchaseConfig.networkID),
            })
            .then(async (res: PurchaseParams) => {
              try {
                const tx = await purchase.request(res, token);
                if (tx) await tx.wait(1);
                else throw Error('Failed to purchase');
              } catch (err) {
                console.log(err);
                throw Error('Failed to purchase');
              }
            });
        },
      };
    },
  };
}
