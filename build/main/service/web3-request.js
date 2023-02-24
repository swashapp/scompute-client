"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3Request = void 0;
const ethers_1 = require("ethers");
const web3_1 = __importDefault(require("web3"));
const request_service_1 = require("./request-service");
async function web3SignMessage(web3, nonce) {
    if (!nonce)
        throw Error('Nonce is not provided');
    const isMetaMask = web3 && web3.currentProvider && web3.currentProvider.isMetaMask;
    const accounts = await web3.eth.getAccounts();
    const address = accounts[0];
    let sign = web3?.eth.sign;
    if (isMetaMask)
        sign = (dataToSign, address, callback) => web3?.eth.personal.sign(dataToSign, address, '', callback);
    return await new Promise((resolve, reject) => {
        sign(web3_1.default.utils.fromUtf8(`${request_service_1.MESSAGE_TO_SIGN_PREFIX}: ${nonce}`), address || '', (err, signature) => {
            if (err)
                reject(err);
            resolve({ address, nonce, signature });
        });
    });
}
class Web3Request extends request_service_1.Request {
    constructor(config, options) {
        super(config.session, options);
        this.config = config;
        this.provider = new ethers_1.providers.Web3Provider(this.config.web3.currentProvider);
    }
    async getSignatureObj() {
        const web3 = this.config.web3;
        const signMessage = (nonce) => web3SignMessage(web3, nonce);
        return await this.signWith(signMessage);
    }
    getProvider() {
        return this.provider;
    }
    getSigner() {
        return this.provider.getSigner();
    }
    async getAccount() {
        const accounts = await this.config.web3.eth.getAccounts();
        return accounts[0];
    }
}
exports.Web3Request = Web3Request;
//# sourceMappingURL=web3-request.js.map