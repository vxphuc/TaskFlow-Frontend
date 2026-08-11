import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'


const e2eDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(e2eDirectory, '..')
const backendDirectory = path.resolve(frontendDirectory, '..', 'backend')
const processes = []

function start(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  child.output = ''
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      child.output = `${child.output}${chunk}`.slice(-8000)
    })
  }
  processes.push(child)
  return child
}

async function waitForUrl(url, child) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server stopped before ${url} was ready.\n${child.output}`)
    }
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The service is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}.\n${child.output}`)
}

function stopProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) return
  child.kill('SIGTERM')
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
  } else {
    child.kill('SIGTERM')
  }
  child.stdout?.destroy()
  child.stderr?.destroy()
}

let exitCode = 1
try {
  const backend = start(
    path.join(backendDirectory, 'venv', 'Scripts', 'python.exe'),
    [path.join(backendDirectory, 'tests', 'e2e_server.py')],
    backendDirectory,
  )
  const frontend = start(
    process.execPath,
    [
      path.join(frontendDirectory, 'node_modules', 'vite', 'bin', 'vite.js'),
      '--host',
      '127.0.0.1',
      '--port',
      '5173',
    ],
    frontendDirectory,
  )

  await Promise.all([
    waitForUrl('http://127.0.0.1:5000/api/health', backend),
    waitForUrl('http://127.0.0.1:5173', frontend),
  ])

  const runner = spawn(
    process.execPath,
    [
      path.join(frontendDirectory, 'node_modules', '@playwright', 'test', 'cli.js'),
      'test',
      ...process.argv.slice(2),
    ],
    {
      cwd: frontendDirectory,
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    },
  )
  exitCode = await new Promise((resolve) => {
    runner.on('exit', (code) => resolve(code ?? 1))
  })
} catch (error) {
  console.error(error)
} finally {
  processes.reverse().forEach(stopProcessTree)
}

process.exit(exitCode)
