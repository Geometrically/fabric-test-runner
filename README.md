# Fabric Test Runner

Welcome to the Fabric Test Runner, a custom GitHub action created for Fabric mods to easily run tests! 

#### Currently Supported Tests:
- Gradle Build Test
- Gradle Run Server

## Usage

Not used to actions? Create a file in ./github/workflows called main.yml . Set the yaml file to the example below!

Using the Fabric Test Runner is extremely simple. Here's some simple functionality, testing the mod on 20w17a, and
uploading the build artifacts!

```yaml
name: Fabric CI

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  runTests:
    runs-on: ubuntu-latest

    steps:
    - name: "Checkout Project"
      uses: actions/checkout@v2
      with:
        lfs: true

    - name: "Run Fabric Tests"
      uses: Geometrically/fabric-test-runner@v1
      with:
        minecraftVersion: 20w17a
    
    - name: "Upload Artifact"
      uses: actions/upload-artifact@v1
      with:
        name: Builds
        path: build/libs
```

Want some more advanced functionality? Below is the Fabric Test Runner running tests for 1.15.2 and the latest version.

```yaml
name: Fabric CI

on:
  push:
    branches: [ master ]
  pull_request:
    branches: [ master ]

jobs:
  buildAndRunForSomeVersions:
      name: Run tests for ${{ matrix.minecraftVersion }}
      runs-on: ubuntu-latest
      strategy:
        fail-fast: false
        matrix:
          minecraftVersion:
            - 1.15.2
            - latest
      steps:
        - uses: actions/checkout@v2
          with:
            lfs: true
        - uses: Geometrically/fabric-test-runner@v1
          id: testRunner
          with:
            minecraftVersion: ${{ matrix.minecraftVersion }}
        - uses: actions/upload-artifact@v1
          with:
            name: Builds
            path: build/libs
```

Other options:

The Fabric Test Runner several other options that were not used in the examples:
- `runBuildTest` (true/false) - Whether the action should run the build test
- `runServerTest` (true/false) - Whether the action should run the server test. Useful for client-only mods.


