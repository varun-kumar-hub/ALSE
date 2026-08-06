import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

const isWindows = platform() === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  return result.status === 0;
}

function hasCommand(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    shell: false,
  });

  return result.status === 0;
}

function installRustup() {
  if (hasCommand('cargo')) {
    return true;
  }

  console.log('Preparing development toolchain...');

  if (isWindows && hasCommand('winget', ['--version'])) {
    return run('winget', [
      'install',
      '--id',
      'Rustlang.Rustup',
      '--silent',
      '--accept-package-agreements',
      '--accept-source-agreements',
    ]);
  }

  if (!isWindows && hasCommand('sh', ['--version'])) {
    return run('sh', [
      '-c',
      'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y',
    ]);
  }

  return false;
}

if (!existsSync('node_modules')) {
  console.log('Installing project packages...');
  if (!run(npmCommand, ['install'])) {
    process.exit(1);
  }
}

installRustup();

const child = spawn(npmCommand, ['run', 'dev:desktop'], {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
