<div align="center">
    <a href="https://swashapp.io/" target="blank">
        <img src="https://swashapp.io/static/images/logo/swash/s-logo.svg" width="80" alt="Swash Logo" />
    </a>
</div>

<div align="center">
    <b>Swash, reimagining data ownership</b>
</div>

# sCompute Client

Swash sCompute SDK is a simple Typescript project that helps you to connect your application to Swash computation stack.

# Issues & Questions

For reporting issues or asking questions please use the [github issues](https://github.com/swashapp/services/issues) or contact [support@swashapp.io](mailto://support@swashapp.io).

# Getting Started

Before getting started, you need to install the [latest LTS version of nodejs](https://nodejs.org/en/download/). Also, It is better to use yarn as package manager, for this purpose you can use the following instruction:

```bash
# Install via npm
npm install --global yarn

# Install via Chocolatey
choco install yarn

# Install via Scoop
scoop install yarn

yarn --version
```

## How to install dependencies

Installing all the dependencies is just simple as running one of the following commands:

NPM:

```bash
npm install
```

Yarn:

```bash
yarn install
```

### Build

First you have to build the project by the following command:

NPM:

```bash
npm run build
```

Yarn:

```bash
yarn run build
```

### Test

To run code-example tests, you have to set docker/config.cfg at first:

```bash
BRANCH=                                     # Required, Branch name of swash services, fountain and pricing project to clone from git
GIT_USERNAME=                               # Required, Git username
GIT_PASSWORD=                               # Required, Git password
SCOMPUTE_PORT=                              # Required, Port number for scompute to listen on
SERVICES_PORT=                              # Required, Port number for services to listen on
PRIVATE_KEY=                                # Required, Your ethereum wallet(with available tokens) private key
PUBLIC_KEY=                                 # Required, Your ethereum wallet public key
TOKEN=                                      # Required, Token name to do purchase

```

Then you can run tests:

NPM:

```bash
npm run test
```

Yarn:

```bash
yarn run test
```

### Bundle

Running build command will compile, optimize and minify the source code and will save the output in the build directory in the root of project. Now you have to add this SDK as a dependency of your project.

# Usage

If using TypeScript you can import the library with:

```bash
import { sComputeClient } from 'scompute-client';
```

## Client Creation

When you want to use sCompute SDK you have to create new instance of sComputeClient. As you know this client helps you order your computation requests, and the requests have to be validated and authenticated, So you have to define your authentication mechanisem to communicate with Swash computation stack.

### Private Key

If you have an valid ethereum account, then Its private key could be used for authentication.
To start a computation, your account is in charge of paying computation cost, therefore you have to define related provider.

Authentication with private key:

```bash
const sCompute = new sComputeClient({
    auth: {
        privateKey: 'your-private-key',
        provider: 'ether-wallet-provider',
    }
})
```

### Web3

If you want to use the client in your browser, and have a MetaMask account, you can create a web3 from window.ethereum and use that for authentication.

Authentication with web3:

```bash
const sCompute = new sComputeClient({
    auth: {
        web3: new Web3(window.ethereum),
    }
})
```

### Access Token

If you have an access token, the client can use that as an authentication key. However, providing an ethereum account(web3 or privateKey) is necessary since it is used to purchase computation costs.

Authentication with token:

```bash
const sCompute = new sComputeClient({
    auth: {
        web3: new Web3(window.ethereum),
        session: {
            token: 'your-access-token',
            onExpired: () => logout()
        }
    }
})
```

## File Management

To start a computation you need to define your preprocess and evaluation python script files. You can upload your files into your dedicated space in Swash computation stack using sComputeClient.

Table below shows file management capabilities of sComputeClient:

| Method   | Description                             |
| :------- | :-------------------------------------- |
| getAll   | Return a list of all files              |
| upload   | Upload a file to your computation space |
| delete   | Remove a file by its name               |
| download | Download a file by provided name        |

Example of uploading file:

```bash
const file = fs.readFileSync(path_to_the_file);
const fileName = "preprocess.py";
sCompute.files.code.upload(file, fileName);
```

## Computation

A Computation process is introduced by pipeline. you can create pipelines for different processing purposes. And also you can execute a pipeline with different datasets. It means that, you can have many pipelines with many executions for each one.

Table below shows pipeline management capabilities of sComputeClient, for a pipeline with a name as identifier you can use this methods:

| Method        | Description                                                                                                       |
| :------------ | :---------------------------------------------------------------------------------------------------------------- |
| create        | Create a pipeline with parameters `processingFile`, `evaluationFile`, `framework`, `algorithm`, `hyperParameters` |
| start         | Start pipeline with `inputDataFile`                                                                               |
| delete        | Remove pipeline                                                                                                   |
| get           | Retrun pipeline                                                                                                   |
| getExecutions | Return a list of all pipeline executions                                                                          |

For example:

```bash
# To get executions list of pipeline
sCompute.pipeline.with(`your-pipeline-name`).getExecutions()

# To create pipeline
sCompute.pipeline.with(`your-pipeline-name`).create({
      algorithm: 'Linear-Learner',
      framework: 'SKLearn',
      evaluationFile,
      processingFile,
      hyperParameters: {
        predictor_type: 'binary_classifier',
        accuracy_top_k: '3',
      },
    })

# To start pipeline
sCompute.pipeline.with(`your-pipeline-name`).start(inputDataFile, { tokenName: 'SWASH', networkID: '5' });
```

And also you can access a specific execution with `executionId`:

```bash
sCompute.pipeline.with(`your-pipeline-name`).execution(`your-execution-id`)
```

Table below shows pipeline execution management capabilities of sComputeClient, for a pipeline with a name and execution with an id:

| Method        | Description                                                                  |
| :------------ | :--------------------------------------------------------------------------- |
| retry         | Retry execution                                                              |
| stop          | Stop execution                                                               |
| get           | Return execution                                                             |
| getSteps      | Return a list of all execution steps with their status                       |
| downloadModel | Download the execution result model if it is ready, e.g. `your-model.tar.gz` |
| downloadLog   | Download the execution logs if it is ready                                   |

For example:

```bash
# To stop execution
sCompute.pipeline.with(`your-pipeline-name`).execution(`your-execution-id`).stop();

# To get steps of execution
sCompute.pipeline.with(`your-pipeline-name`).execution(`your-execution-id`).getSteps();

# To download trained model if execution was successful
sCompute.pipeline.with(`your-pipeline-name`).execution(`your-execution-id`).downloadModel();
```

# Copyright

Copyright © Swashapp.io 2022. All rights reserved.
