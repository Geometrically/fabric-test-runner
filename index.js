const fetch = require('node-fetch');
const parseStringPromise = require('xml2js').parseStringPromise;
const core = require('@actions/core');
const fs = require('fs');
const readline = require('readline');
const { spawn } = require('child_process');

const version = core.getInput('minecraftVersion');

let loaderVersion = '0.8.2+build.194';
let yarnVersion = '1.15.2+build.15';
let minecraftVersion = '1.15.2';
let fabricVersion = '0.7.1+build.301-1.15';

async function run() {
  const loaderResp = await fetch('https://meta.fabricmc.net/v1/versions/loader/' + version,{
    method: 'get',
    credentials: 'include',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  const json = await loaderResp.json();

  console.log('[ACTION] Requesting data via HTTPS GET from https://meta.fabricmc.net/v1/versions/loader/' + version + '\n')

  yarnVersion = json[0].mappings.version;
  minecraftVersion = json[0].mappings.gameVersion;
  loaderVersion = json[0].loader.version;

  console.log('[ACTION] Minecraft version retrieved! Version ' + minecraftVersion + '\n');
  console.log('[ACTION] Yarn version retrieved! Version ' + yarnVersion);
  console.log('[ACTION] Fabric Loader version retrieved! Version ' + loaderVersion + '\n');

  const mavenResp = await fetch('https://maven.fabricmc.net/net/fabricmc/fabric-api/fabric-api/maven-metadata.xml', {
    method: 'get',
    credentials: 'include',
    mode: 'no-cors'
  });

  const text = await mavenResp.text();

  console.log('[ACTION] Requesting data via HTTPS GET from https://maven.fabricmc.net/net/fabricmc/fabric-api/fabric-api/maven-metadata.xml')

  await parseStringPromise(text).then((result) => {
    let branch = '1.15';

    if(minecraftVersion === '1.14.4'){
      branch = '1.14';
    } else if (minecraftVersion.startsWith('20w')) {
      branch = '1.16';
    }

    let latestVersion = result.metadata.versioning[0].release;

    result.metadata.versioning[0].versions.forEach((version) => {
      if(String(version).endsWith(branch))
        latestVersion = String(version);
    })

    fabricVersion = latestVersion;

    console.log('[ACTION] Fabric API version retrieved! Version ' + fabricVersion);
  }).catch((err) => {
    core.setFailed(err.message);
  })

  let stream = fs.createReadStream('./gradle.properties')

  const props = readline.createInterface({
    input: stream
  });

  let writeLines = '';

  props.on('line', (line) => {
    let writeLine = line;

    if(line.includes('minecraft_version'))
      writeLine = '\tminecraft_version=' + minecraftVersion
    else if (line.includes('yarn_mappings'))
      writeLine = '\tyarn_mappings=' + yarnVersion
    else if (line.includes('loader_version'))
      writeLine = '\tloader_version=' + loaderVersion
    else if (line.includes('fabric_version'))
      writeLine = '\tfabric_version=' + fabricVersion

    writeLines += writeLine + '\n';
  });

  stream.on('end', () => {
    try {
      fs.writeFileSync('./gradle.properties', writeLines);

      console.log('[ACTION] Successfully wrote to gradle.properties! Running gradle build test.');
      runBuild(() => {
        console.log('[ACTION] Running server test pre-EULA agreement via gradle!');
        runServer(() => {
          let eulaStream = fs.createReadStream('./run/eula.txt');

          const eula = readline.createInterface({
            input: eulaStream
          });

          writeLines = '';

          eula.on('line', (line) => {
            let writeLine = String(line);

            if (line.includes('eula=false'))
              writeLine = 'eula=true'

            writeLines = writeLines + writeLine + '\n';
          });

          eulaStream.on('end', () => {
            fs.writeFile('./run/eula.txt', writeLines, (err) => {
              if (err)
                return core.setFailed(err.message);

              console.log('[ACTION] Successfully accepted EULA! Running server test now.')
              runServer(() => console.log('[ACTION] All tests have passed!'));
            })
          })
        });
      })
    } catch (err) {
      core.setFailed(err);
    }
  });
}

async function runBuild(callback) {
  const build = await spawn('./gradlew', ['build', '--refresh-dependencies'])

  build.stdout.on('data', (data) => console.log(`${data}`));

  build.stderr.on('data', (data) => console.error(`${data}`));

  build.on('error', (err) => console.error(err))

  build.on('close', (code) => callback())
}

async function runServer(callback) {
  const server = await spawn('./gradlew', ['runServer', '--args=“nogui”'])

  server.stdout.on('data', (data) => {
    if(data.includes('Preparing spawn area'))
      server.kill();

    console.log(`${data}`)
  });

  server.stderr.on('data', (data) => console.error(`${data}`));

  server.on('error', (err) => console.error(err))

  server.on('close', (code) => callback())
}

run();






