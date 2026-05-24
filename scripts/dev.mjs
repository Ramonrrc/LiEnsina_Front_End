import { execFileSync, spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import net from 'node:net'
import { platform } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const isWindows = platform() === 'win32'
const devHost = process.env.VITE_DEV_HOST || '127.0.0.1'
const devPort = Number(process.env.VITE_DEV_PORT || 5173)

if (!Number.isInteger(devPort) || devPort < 1 || devPort > 65535) {
  console.error('[dev] VITE_DEV_PORT invalida. Use um numero entre 1 e 65535.')
  process.exit(1)
}

function normalize(value) {
  return String(value || '').toLowerCase().replaceAll('/', '\\')
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
}

function parseJsonLines(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

function isProjectDevProcess(item) {
  const commandLine = normalize(item.CommandLine || item.commandLine)
  const name = normalize(item.Name || item.name)
  const root = normalize(projectRoot)
  const rootName = normalize(path.basename(projectRoot))

  if (!commandLine.includes(root) && !commandLine.includes(rootName)) return false

  return (
    commandLine.includes('vite') ||
    commandLine.includes('esbuild') ||
    name.includes('esbuild')
  )
}

function getWindowsProjectDevProcesses() {
  const script = `
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
    foreach ($processInfo in $processes) {
      if ([string]::IsNullOrWhiteSpace($processInfo.CommandLine)) { continue }
      if ($processInfo.ProcessId -eq ${process.pid}) { continue }
      try {
        [PSCustomObject]@{
          ProcessId = $processInfo.ProcessId
          ParentProcessId = $processInfo.ParentProcessId
          Name = $processInfo.Name
          CommandLine = $processInfo.CommandLine
        } | ConvertTo-Json -Compress
      } catch {
      }
    }
  `

  try {
    const output = run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script])
    return parseJsonLines(output).filter(isProjectDevProcess)
  } catch {
    return []
  }
}

function getUnixProjectDevProcesses() {
  let output = ''
  try {
    output = run('sh', ['-lc', 'ps -eo pid=,ppid=,comm=,command='])
  } catch {
    return []
  }

  return output
    .split(/\r?\n/)
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/)
      if (!match) return null
      return {
        ProcessId: Number(match[1]),
        ParentProcessId: Number(match[2]),
        Name: match[3],
        CommandLine: match[4],
      }
    })
    .filter(Boolean)
    .filter((item) => item.ProcessId !== process.pid)
    .filter(isProjectDevProcess)
}

function getProjectDevProcesses() {
  return isWindows ? getWindowsProjectDevProcesses() : getUnixProjectDevProcesses()
}

function getWindowsPortOwners() {
  const script = `
    $connections = Get-NetTCPConnection -State Listen -LocalPort ${devPort} -ErrorAction SilentlyContinue
    foreach ($owner in ($connections | Select-Object -ExpandProperty OwningProcess -Unique)) {
      $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction SilentlyContinue
      [PSCustomObject]@{
        ProcessId = $owner
        ParentProcessId = $processInfo.ParentProcessId
        Name = $processInfo.Name
        CommandLine = $processInfo.CommandLine
      } | ConvertTo-Json -Compress
    }
  `

  try {
    return run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script])
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

function getDockerContainersOnDevPort() {
  let output = ''
  try {
    output = run('docker', ['ps', '--format', '{{.ID}}\t{{.Names}}\t{{.Ports}}'])
  } catch {
    return []
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, names, ports] = line.split('\t')
      return { id, names, ports }
    })
    .filter((item) => item.id && item.names && item.ports)
    .filter((item) => item.ports.includes(`:${devPort}->`))
    .filter((item) => normalize(item.names).includes('MeuEnsino'))
}

function stopProcessTree(pid) {
  try {
    if (isWindows) {
      execFileSync('taskkill.exe', ['/PID', String(pid), '/F', '/T'], { stdio: 'ignore' })
    } else {
      process.kill(pid, 'SIGTERM')
    }
  } catch {
    // The process may already have exited.
  }
}

function stopOldDockerFrontend() {
  const containers = getDockerContainersOnDevPort()
  if (!containers.length) return

  console.log(`[dev] Encerrando container antigo na porta ${devPort}: ${containers.map((item) => item.names).join(', ')}`)

  for (const container of containers) {
    try {
      execFileSync('docker', ['stop', container.id], { stdio: 'ignore' })
    } catch {
      // Docker may already have stopped the container.
    }
  }
}

function stopProjectDevServerOnPort() {
  const owners = isWindows ? getWindowsPortOwners() : []
  const pids = owners
    .filter(isProjectDevProcess)
    .map((owner) => Number(owner.ProcessId))
    .filter((pid) => Number.isInteger(pid) && pid > 0)

  if (!pids.length) return

  console.log(`[dev] Encerrando Vite antigo na porta ${devPort}: ${pids.join(', ')}`)

  for (const pid of pids) {
    stopProcessTree(pid)
  }
}

function stopOldDevServer() {
  const pids = [...new Set(getProjectDevProcesses().map((item) => Number(item.ProcessId)))]
    .filter((pid) => Number.isInteger(pid) && pid > 0)
  if (!pids.length) return

  console.log(`[dev] Encerrando Vite/esbuild antigos deste projeto: ${pids.join(', ')}`)

  for (const pid of pids) {
    stopProcessTree(pid)
  }
}

function cleanViteCache() {
  const cachePaths = [
    path.join(projectRoot, '.vite'),
    path.join(projectRoot, 'node_modules', '.vite'),
  ]

  for (const cachePath of cachePaths) {
    rmSync(cachePath, { recursive: true, force: true })
  }

  console.log('[dev] Cache do Vite limpo para iniciar o front mais atualizado.')
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function canListenOnDevPort() {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close(() => resolve(true))
    })

    server.listen(devPort, devHost)
  })
}

async function assertPortIsFree() {
  let owners = []

  for (let attempt = 0; attempt < 12; attempt += 1) {
    owners = isWindows ? getWindowsPortOwners() : []
    if (owners.length) {
      await sleep(250)
      continue
    }

    if (await canListenOnDevPort()) return
    await sleep(250)
  }

  console.error(`[dev] A porta ${devPort} ja esta ocupada.`)
  for (const owner of owners) {
    console.error(`[dev] - PID ${owner.ProcessId}: ${owner.Name || 'processo desconhecido'}`)
  }
  console.error('[dev] Feche o outro servidor antes de iniciar este projeto.')
  console.error('[dev] O Vite esta com strictPort ativo para evitar abrir o front errado.')
  process.exit(1)
}

function getDescendantPids(processes, parentPid) {
  const descendants = new Set()
  let changed = true

  while (changed) {
    changed = false

    for (const item of processes) {
      const pid = Number(item.ProcessId)
      const ppid = Number(item.ParentProcessId)
      if (pid === parentPid || descendants.has(pid)) continue
      if (ppid === parentPid || descendants.has(ppid)) {
        descendants.add(pid)
        changed = true
      }
    }
  }

  return descendants
}

function getEsbuildPidsFor(vitePid) {
  const processes = getProjectDevProcesses()
  const descendants = getDescendantPids(processes, vitePid)

  return processes
    .filter((item) => descendants.has(Number(item.ProcessId)))
    .filter((item) => {
      const commandLine = normalize(item.CommandLine)
      const name = normalize(item.Name)
      return commandLine.includes('esbuild') || name.includes('esbuild')
    })
    .map((item) => Number(item.ProcessId))
    .filter((pid) => Number.isInteger(pid) && pid > 0)
}

function monitorEsbuildLifecycle(viteProcess) {
  const knownEsbuildPids = new Set()
  let missingChecks = 0

  const timer = setInterval(() => {
    if (viteProcess.exitCode !== null || viteProcess.killed) {
      clearInterval(timer)
      return
    }

    const esbuildPids = getEsbuildPidsFor(viteProcess.pid)
    if (esbuildPids.length) {
      const currentPids = new Set(esbuildPids)
      const closedPid = [...knownEsbuildPids].find((pid) => !currentPids.has(pid))
      if (closedPid) {
        console.error(`[dev] O esbuild PID ${closedPid} foi encerrado. Fechando o Vite para evitar front desatualizado.`)
        stopProcessTree(viteProcess.pid)
        process.exit(1)
      }

      for (const pid of esbuildPids) {
        knownEsbuildPids.add(pid)
      }

      missingChecks = 0
      return
    }

    if (!knownEsbuildPids.size) return

    missingChecks += 1
    if (missingChecks < 3) return

    console.error('[dev] O esbuild deste Vite foi encerrado. Fechando o Vite para evitar front desatualizado.')
    stopProcessTree(viteProcess.pid)
    process.exit(1)
  }, 1000)

  return () => clearInterval(timer)
}

async function startVite() {
  const viteEntry = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  if (!existsSync(viteEntry)) {
    console.error('[dev] Vite nao encontrado. Rode npm install antes de iniciar o servidor.')
    process.exit(1)
  }

  await assertPortIsFree()

  const child = spawn(process.execPath, [
    viteEntry,
    '--force',
    '--host',
    devHost,
    '--port',
    String(devPort),
    '--strictPort',
  ], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
    shell: false,
  })

  const stopMonitor = monitorEsbuildLifecycle(child)

  const stopChild = () => {
    stopMonitor()
    if (!child.killed) stopProcessTree(child.pid)
  }

  process.on('SIGINT', stopChild)
  process.on('SIGTERM', stopChild)
  child.on('error', () => {
    stopMonitor()
    process.exit(1)
  })
  child.on('exit', (code, signal) => {
    stopMonitor()
    process.exit(code ?? (signal ? 1 : 0))
  })
}

stopOldDevServer()
stopOldDockerFrontend()
stopProjectDevServerOnPort()
cleanViteCache()
await startVite()
