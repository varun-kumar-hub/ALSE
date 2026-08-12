import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';

const isWindows = platform() === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    ...options,
  });

  return result.status === 0;
}

function hasCommand(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    stdio: 'ignore',
    shell: isWindows,
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

function hasWorkingLinker() {
  if (hasCommand('link')) return true;
  try {
    const res = spawnSync('gcc', ['-dumpmachine'], { encoding: 'utf-8', shell: isWindows });
    if (res.status === 0 && res.stdout && res.stdout.includes('x86_64')) return true;
  } catch {
    // ignore
  }
  return false;
}

const canBuildDesktop = hasCommand('cargo') && hasWorkingLinker();
const targetScript = canBuildDesktop ? 'dev:desktop' : 'web';

if (!canBuildDesktop && hasCommand('cargo')) {
  console.log('⚡ Visual Studio C++ Build Tools (link.exe) not found. Starting in Web Mode (http://localhost:1420)...');
  console.log('💡 Note: All AI features, search tools, and local Ollama inference work 100% in Web Mode.');
} else {
  console.log(`Starting Nexus Agent in ${canBuildDesktop ? 'Desktop (Tauri)' : 'Web (Vite)'} mode...`);
}

const child = spawn(npmCommand, ['run', targetScript], {
  stdio: 'inherit',
  shell: isWindows,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
