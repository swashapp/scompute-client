import { providers, Signer } from 'ethers';
import Web3 from 'web3';

import { AuthWeb3Config, sComputeClientOptions, SignatureOBJ } from '../types';

import { MESSAGE_TO_SIGN_PREFIX, Request } from './request-service';

async function web3SignMessage(
  web3: Web3,
  nonce: number,
): Promise<SignatureOBJ> {
  if (!nonce) throw Error('Nonce is not provided');
  const isMetaMask =
    web3 && web3.currentProvider && (web3.currentProvider as any).isMetaMask;
  const accounts = await web3.eth.getAccounts();
  const address = accounts[0];
  let sign = web3?.eth.sign;
  if (isMetaMask)
    sign = (
      dataToSign: string,
      address: string,
      callback?: (error: Error, signature: string) => void,
    ): Promise<string> =>
      web3?.eth.personal.sign(dataToSign, address, '', callback);
  return await new Promise((resolve, reject) => {
    sign(
      Web3.utils.fromUtf8(`${MESSAGE_TO_SIGN_PREFIX}: ${nonce}`),
      address || '',
      (err: any, signature: string) => {
        if (err) reject(err);
        resolve({ address, nonce, signature });
      },
    );
  });
}

export class Web3Request extends Request {
  private config: AuthWeb3Config;
  private provider: providers.Web3Provider;

  constructor(config: AuthWeb3Config, options: sComputeClientOptions) {
    super(config.session, options);
    this.config = config;
    this.provider = new providers.Web3Provider(
      this.config.web3.currentProvider as any,
    );
  }

  public async getSignatureObj(): Promise<SignatureOBJ> {
    const web3 = this.config.web3;
    const signMessage = (nonce: number): Promise<SignatureOBJ> =>
      web3SignMessage(web3, nonce);
    return await this.signWith(signMessage);
  }

  public getProvider(): providers.BaseProvider {
    return this.provider;
  }

  public getSigner(): Signer {
    return this.provider.getSigner();
  }

  public async getAccount(): Promise<string> {
    const accounts = await this.config.web3.eth.getAccounts();
    return accounts[0];
  }
}
