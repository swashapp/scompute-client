"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRequest = void 0;
const ethers_1 = require("ethers");
const request_service_1 = require("./request-service");
async function walletSignMessage(wallet, nonce) {
    if (!nonce)
        throw Error('Nonce is not provided');
    const address = await wallet.getAddress();
    return await new Promise((resolve, reject) => {
        wallet
            .signMessage(`${request_service_1.MESSAGE_TO_SIGN_PREFIX}: ${nonce}`)
            .then((signature) => {
            resolve({ address, nonce, signature });
        })
            .catch(reject);
    });
}
class WalletRequest extends request_service_1.Request {
    constructor(config, options) {
        super(config.session, options);
        this.config = config;
        this.provider = config.provider;
        this.wallet = new ethers_1.Wallet(config.privateKey, this.provider);
    }
    async getSignatureObj() {
        const wallet = this.wallet;
        const signMessage = (nonce) => walletSignMessage(wallet, nonce);
        return await this.signWith(signMessage);
    }
    getProvider() {
        return this.provider;
    }
    getSigner() {
        return this.wallet;
    }
    getAccount() {
        return this.wallet.getAddress();
    }
}
exports.WalletRequest = WalletRequest;
//# sourceMappingURL=wallet-request.js.map