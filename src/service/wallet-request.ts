import { providers, Signer, Wallet } from 'ethers';

import {
  AuthWalletConfig,
  sComputeClientOptions,
  SignatureOBJ,
} from '../types';

import { MESSAGE_TO_SIGN_PREFIX, Request } from './request-service';

async function walletSignMessage(
  wallet: Wallet,
  nonce: number,
): Promise<SignatureOBJ> {
  if (!nonce) throw Error('Nonce is not provided');
  const address = await wallet.getAddress();
  return await new Promise((resolve, reject) => {
    wallet
      .signMessage(`${MESSAGE_TO_SIGN_PREFIX}: ${nonce}`)
      .then((signature) => {
        resolve({ address, nonce, signature });
      })
      .catch(reject);
  });
}
export class WalletRequest extends Request {
  private config: AuthWalletConfig;
  private wallet: Wallet;
  private provider: providers.BaseProvider;

  constructor(config: AuthWalletConfig, options: sComputeClientOptions) {
    super(config.session, options);
    this.config = config;
    this.provider = config.provider;
    this.wallet = new Wallet(config.privateKey, this.provider);
  }

  public async getSignatureObj(): Promise<SignatureOBJ> {
    const wallet = this.wallet;
    const signMessage = (nonce: number): Promise<SignatureOBJ> =>
      walletSignMessage(wallet, nonce);
    return await this.signWith(signMessage);
  }

  public getProvider(): providers.BaseProvider {
    return this.provider;
  }

  public getSigner(): Signer {
    return this.wallet;
  }

  public getAccount(): Promise<string> {
    return this.wallet.getAddress();
  }
}
