import { fail } from 'assert';
import { Buffer } from 'buffer';

import { randomUUID } from 'crypto';
import path from 'path';

import * as dotenv from 'dotenv';
import { Contract, getDefaultProvider, providers, Wallet } from 'ethers';

import { formatEther } from 'ethers/lib/utils';

import { ERC20_ABI } from '../constants';
import { sComputeClient } from '../main';
import { Purchase } from '../service';

import { PipelineExecutionStatus } from '../types';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

const createClient = async (
  privateKey: string,
  provider: providers.BaseProvider,
): Promise<sComputeClient> => {
  const client = new sComputeClient({
    auth: { privateKey, provider },
    options: {
      host: process.env.HOST || 'http://localhost:8090',
      servicesHost: process.env.SERVICES_HOST || 'http://localhost:3000',
    },
  });
  return client;
};

describe('File management', () => {
  let client: sComputeClient = null;

  beforeAll(async () => {
    const wallet = Wallet.createRandom();
    client = await createClient(wallet.privateKey, getDefaultProvider());
  });

  it('upload file should work correctly', async () => {
    //arrange
    const content = '#This is the sample file';
    const buffer = Buffer.from(content);
    const fileName = 'preprocess-test1.py';

    //act
    await client.files.code.with(fileName).upload(buffer);

    //assert
    const files = await client.files.code.getAll();
    expect(files.find((f) => f.name === fileName)).toBeTruthy();
  });

  it('download file should work correctly', async () => {
    //arrange
    const content = '#This is the sample file';
    const buffer = Buffer.from(content);
    const fileName = 'preprocess-test2.py';
    await client.files.code.with(fileName).upload(buffer);

    //act
    const blob = await client.files.code.with(fileName).download();

    //assert
    const text = await blob.text();
    expect(text).toBe(content);
  });

  it('delete file should work correctly', async () => {
    //arrange
    const content = '#This is the sample file';
    const buffer = Buffer.from(content);
    const fileName = 'preprocess-test3.py';
    await client.files.code.with(fileName).upload(buffer);

    //assert
    let files = await client.files.code.getAll();
    expect(files.find((f) => f.name === fileName)).toBeTruthy();

    //act
    await client.files.code.with(fileName).delete();

    //assert
    files = await client.files.code.getAll();
    expect(files.find((f) => f.name === fileName)).toBeFalsy();
  });
});

describe('Computation: Pipeline management', () => {
  let client: sComputeClient = null;
  let wallet: Wallet;
  let processingFile: string;
  let evaluationFile: string;
  let inputDataFile = 'inputDataFile';
  let tokenName = 'SWASH';
  let networkID = '5';
  let provider: providers.BaseProvider;

  const checkAvailableTokens = async (): Promise<void> => {
    //arrange
    const purchase = new Purchase(networkID, provider, wallet);
    const token = await purchase.getToken(tokenName);
    const contract = new Contract(token.tokenAddress, ERC20_ABI, wallet);

    //act
    const balanceInWei = (await contract.balanceOf(wallet.address)).toString();
    const balance = formatEther(balanceInWei);

    //assert
    expect(Number(balance)).toBeGreaterThan(100);
  };

  const _10s = 10000;
  const _40s = 40000;

  const waitFor = async (ms: number): Promise<any> =>
    await new Promise((resolve) => setTimeout(resolve, ms));

  const expectWhile = async (
    fn: () => Promise<boolean>,
    props: { every: number; limit: number; errMessage: string },
  ): Promise<void> => {
    const res = await fn();
    if (!res) {
      if (props.limit === 0) fail(props.errMessage);
      waitFor(props.every);
      expectWhile(fn, {
        ...props,
        limit: props.limit - props.every,
      });
    }
  };
  const createTestPipeline = async (pipelineName: string): Promise<void> => {
    await client.pipeline.with(pipelineName).create({
      algorithm: 'Linear-Learner',
      framework: 'SKLearn',
      evaluationFile,
      processingFile,
      hyperParameters: {
        predictor_type: 'binary_classifier',
        accuracy_top_k: '3',
      },
    });
  };

  beforeAll(async () => {
    const privateKey = process.env.PRIVATE_KEY;
    const providerURL = process.env.NETWORK_PROVIDER;
    provider = new providers.WebSocketProvider(providerURL);
    wallet = new Wallet(privateKey, provider);
    networkID = process.env.NETWORK || '5';
    tokenName = process.env.TOKEN || 'SWASH';
    client = await createClient(privateKey, provider);

    //upload files
    const content = '#This is the sample file';
    const buffer = Buffer.from(content);
    processingFile = 'preprocess.py';
    await client.files.code.with(processingFile).upload(buffer);
    evaluationFile = 'evaluaiton.py';
    await client.files.code.with(evaluationFile).upload(buffer);
    const dataFiles = await client.files.data.getAll();
    if (dataFiles.length > 0) inputDataFile = dataFiles[0].name;
  });

  it('create pipeline should work correctly', async () => {
    //arrange
    const pipelineName = randomUUID();

    //act
    await client.pipeline.with(pipelineName).create({
      algorithm: 'Linear-Learner',
      framework: 'SKLearn',
      evaluationFile,
      processingFile,
      hyperParameters: {
        predictor_type: 'binary_classifier',
        accuracy_top_k: '3',
      },
    });

    //assert
    const pipelines = await client.pipeline.getAll();
    expect(pipelines.find((p) => p.name === pipelineName)).toBeTruthy();
  });

  it('delete pipeline should work correctly', async () => {
    //arrange
    const pipelineName = randomUUID();
    await createTestPipeline(pipelineName);

    //assert
    let pipelines = await client.pipeline.getAll();
    expect(pipelines.find((p) => p.name === pipelineName)).toBeTruthy();

    //act
    await client.pipeline.with(pipelineName).delete();

    //assert
    pipelines = await client.pipeline.getAll();
    expect(pipelines.find((p) => p.name === pipelineName)).toBeFalsy();
  });

  it('start pipeline should work correctly', async () => {
    //pre-cond
    await checkAvailableTokens();

    //arrange
    const pipelineName = randomUUID();
    await createTestPipeline(pipelineName);

    //act
    await client.pipeline
      .with(pipelineName)
      .start(inputDataFile, { tokenName, networkID });

    //assert
    await expectWhile(
      async () => {
        const executions = await client.pipeline
          .with(pipelineName)
          .getExecutions();
        return (
          executions.length === 1 &&
          executions[0].status === PipelineExecutionStatus.EXECUTING
        );
      },
      { every: _10s, limit: _40s, errMessage: 'execution not found' },
    );
  }, 60000);

  it('stop pipeline should work correctly', async () => {
    //pre-cond
    await checkAvailableTokens();

    //arrange
    const pipelineName = randomUUID();
    await createTestPipeline(pipelineName);
    await client.pipeline
      .with(pipelineName)
      .start(inputDataFile, { tokenName, networkID });

    //act
    await expectWhile(
      async () => {
        const executions = await client.pipeline
          .with(pipelineName)
          .getExecutions();
        return (
          executions.length === 1 &&
          executions[0].status === PipelineExecutionStatus.EXECUTING
        );
      },
      { every: _10s, limit: _40s, errMessage: 'execution not found' },
    );
    let executions = await client.pipeline.with(pipelineName).getExecutions();
    await client.pipeline.with(pipelineName).execution(executions[0].id).stop();

    //assert
    executions = await client.pipeline.with(pipelineName).getExecutions();
    expect(executions[0].status).toBe(PipelineExecutionStatus.STOPPED);
  }, 60000);
});
