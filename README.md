# Depi

![Build Status](https://github.com/AlvaroMtz/Depi/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/AlvaroMtz/Depi/branch/main/graph/badge.svg)](https://codecov.io/gh/AlvaroMtz/Depi)
[![npm version](https://badge.fury.io/js/depi.svg)](https://badge.fury.io/js/depi)

Depi is a [dependency injection](https://en.wikipedia.org/wiki/Dependency_injection) tool for TypeScript and JavaScript. With it you can build well-structured and easily testable applications in Node or in the browser.

Main features includes:

- property based injection
- constructor based injection
- singleton and transient services
- support for multiple DI containers

## Installation

> Note: This installation guide is for usage with TypeScript. If you wish to use
> Depi without TypeScript, please read the documentation on how to get started.

To start using Depi, install the required packages via NPM:

```bash
npm install depi reflect-metadata
```

Import the `reflect-metadata` package at the **first line** of your application:

```ts
import 'reflect-metadata';

// Your other imports and initialization code
// comes here after you imported the reflect-metadata package!
```

As a last step, you need to enable emitting decorator metadata in your TypeScript config. Add these two lines to your `tsconfig.json` file under the `compilerOptions` key:

```json
"emitDecoratorMetadata": true,
"experimentalDecorators": true,
```

Now you are ready to use Depi with TypeScript!

## Basic Usage

```ts
import { Container, Service } from 'depi';

@Service()
class ExampleInjectedService {
  printMessage() {
    console.log('I am alive!');
  }
}

@Service()
class ExampleService {
  constructor(
    // because we annotated ExampleInjectedService with the @Service()
    // decorator Depi will automatically inject an instance of
    // ExampleInjectedService here when the ExampleService class is requested
    // from Depi.
    public injectedService: ExampleInjectedService
  ) {}
}

const serviceInstance = Container.get(ExampleService);
// we request an instance of ExampleService from Depi

serviceInstance.injectedService.printMessage();
// logs "I am alive!" to the console
```

## Documentation

The detailed usage guide and API documentation for the project can be found:

- at [repository docs][docs-stable]
- in the `./docs` folder of the repository

[docs-stable]: ./docs/README.md

## Contributing

Please read our [contributing guidelines](./CONTRIBUTING.md) to get started.
