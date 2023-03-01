"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sComputeClient = void 0;
const service_1 = require("./service");
class sComputeClient {
    constructor(config) {
        this.files = {
            code: {
                getAll: () => this.request.GET(service_1.URI.CODE_FILE),
                with: (name) => {
                    const sdk = this;
                    return {
                        upload: (file) => sdk.request.POSTFile(service_1.URI.CODE_FILE, file, name),
                        delete: () => sdk.request.DELETE(service_1.URI.CODE_FILE, { fileName: name }),
                        download: async () => {
                            const res = await sdk.request.DOWNLOAD(`${service_1.URI.CODE_FILE}/download`, {
                                fileName: name,
                            });
                            return await res.blob();
                        },
                    };
                },
            },
            data: {
                getAll: () => this.request.GET(service_1.URI.DATA_FILE),
            },
        };
        this.pipeline = {
            getAll: () => this.request.GET(`${service_1.URI.PIPELINE}/list`),
            with: (name) => {
                const sdk = this;
                return {
                    execution: (executionId) => {
                        return {
                            getSteps: () => {
                                return sdk.request.GET(`${service_1.URI.PIPELINE}/steps`, {
                                    executionId,
                                    pipelineName: name,
                                });
                            },
                            stop: () => {
                                return sdk.request.POST(`${service_1.URI.PIPELINE}/stop`, {
                                    pipelineName: name,
                                    executionId,
                                });
                            },
                            retry: () => {
                                return sdk.request.POST(`${service_1.URI.PIPELINE}/retry`, {
                                    pipelineName: name,
                                    executionId,
                                });
                            },
                            get: () => sdk.request.GET(`${service_1.URI.PIPELINE}/execution`, {
                                pipelineName: name,
                                executionId,
                            }),
                            downloadModel: async () => {
                                const res = await sdk.request.DOWNLOAD(`${service_1.URI.PIPELINE}/model`, {
                                    pipelineName: name,
                                    executionId,
                                });
                                return await res.blob();
                            },
                            downloadLog: async () => {
                                const res = await sdk.request.DOWNLOAD(`${service_1.URI.PIPELINE}/log`, {
                                    pipelineName: name,
                                    executionId,
                                });
                                return await res.blob();
                            },
                        };
                    },
                    get: () => sdk.request.GET(service_1.URI.PIPELINE, { pipelineName: name }),
                    create: (props) => {
                        return sdk.request.POST(service_1.URI.PIPELINE, {
                            pipelineName: name,
                            ...props,
                            hyperParameters: JSON.stringify(props.hyperParameters),
                        });
                    },
                    delete: () => {
                        return sdk.request.DELETE(service_1.URI.PIPELINE, {
                            pipelineName: name,
                        });
                    },
                    getExecutions: () => {
                        return sdk.request.GET(`${service_1.URI.PIPELINE}/execution/list`, {
                            pipelineName: name,
                        });
                    },
                    start: async (inputDataFile, purchaseConfig) => {
                        const provider = sdk.request.getProvider();
                        const signer = sdk.request.getSigner();
                        const account = await sdk.request.getAccount();
                        const purchase = new service_1.Purchase(purchaseConfig.networkID, provider, signer);
                        const token = await purchase.getToken(purchaseConfig.tokenName);
                        await purchase.approve(token, account);
                        return sdk.request
                            .POST(`${service_1.URI.PIPELINE}/start`, {
                            pipelineName: name,
                            inputDataFile,
                        })
                            .then(async (res) => {
                            try {
                                const tx = await purchase.request(res, token);
                                if (tx)
                                    await tx.wait(1);
                                else
                                    throw Error('Failed to purchase');
                            }
                            catch (err) {
                                console.log(err);
                                throw Error('Failed to purchase');
                            }
                        });
                    },
                };
            },
        };
        const auth = config.auth;
        const options = config.options;
        if (auth.web3)
            this.request = new service_1.Web3Request(auth, options);
        else if (auth.privateKey)
            this.request = new service_1.WalletRequest(auth, options);
    }
    getSignature() {
        return this.request.getSignatureObj();
    }
}
exports.sComputeClient = sComputeClient;
//# sourceMappingURL=main.js.map