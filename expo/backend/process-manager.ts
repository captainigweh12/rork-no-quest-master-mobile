// backend/process-manager.ts - "Can't Kill Me With a Hammer" Edition
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Server } from "node:http";
import net from "node:net";

const px = promisify(exec);

type PidMeta = {
  pid: number;
  startedAt: number;
  cmd?: string;
  portHint?: number;
  signature?: string; // Added for PID reuse protection
};

const PID_FILENAME = ".backend-process.pid";
const PID_TMP = ".backend-process.pid.tmp";

const ROOT = process.cwd();
const PID_PATH = path.join(ROOT, PID_FILENAME);
const PID_TMP_PATH = path.join(ROOT, PID_TMP);

const isWin = process.platform === "win32";
const isDocker = fs.existsSync("/.dockerenv") || fs.existsSync("/proc/1/cgroup");

// Track sockets for force-close on shutdown
const activeSockets = new Set<import("node:net").Socket>();
let attachedServer: Server | undefined;
let initialized = false;
let shuttingDown = false;

// Structured logging for production
function jlog(level: "info" | "warn" | "error", msg: string, extra: Record<string, any> = {}) {
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify({ ts: Date.now(), level, msg, pid: process.pid, ...extra }));
  }
}

function log(...args: any[]) {
  console.log("🛡️  [PM]", ...args);
  jlog("info", args.join(" "));
}

function warn(...args: any[]) {
  console.warn("⚠️  [PM]", ...args);
  jlog("warn", args.join(" "));
}

function err(...args: any[]) {
  console.error("❌ [PM]", ...args);
  jlog("error", args.join(" "));
}

async function atomicWrite(file: string, contents: string) {
  await fsp.writeFile(PID_TMP_PATH, contents, { encoding: "utf8" });
  await fsp.rename(PID_TMP_PATH, file);
}

function procExists(pid: number): boolean {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function createSignature(): string {
  // Signature to prevent PID reuse attacks
  return `${process.ppid}:${path.basename(process.execPath)}`;
}

async function readPidMeta(file = PID_PATH): Promise<PidMeta | null> {
  try {
    const raw = await fsp.readFile(file, "utf8");
    const meta = JSON.parse(raw) as PidMeta;
    return typeof meta?.pid === "number" ? meta : null;
  } catch {
    return null;
  }
}

async function writePidMeta(meta: PidMeta) {
  const json = JSON.stringify(meta, null, 2);
  await atomicWrite(PID_PATH, json);
}

async function removePidFile() {
  try {
    await fsp.unlink(PID_PATH);
  } catch {}
}

async function killPid(pid: number) {
  if (!pid || pid === process.pid) return;
  try {
    if (isWin) {
      await px(`taskkill /PID ${pid} /T /F`);
    } else {
      process.kill(pid, "SIGTERM");
      await new Promise((r) => setTimeout(r, 600));
      if (procExists(pid)) process.kill(pid, "SIGKILL");
    }
  } catch (e) {
    warn(`killPid(${pid})`, (e as Error)?.message);
  }
}

// Node-based port probe (no external tools)
async function probePortWithNode(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net
      .createServer()
      .once("error", () => resolve(true)) // Port in use
      .once("listening", () => {
        srv.close(() => resolve(false)); // Port free
      })
      .listen(port, "0.0.0.0");
  });
}

async function findPidOnPort(port: number): Promise<number | null> {
  try {
    if (isWin) {
      const { stdout } = await px(`netstat -ano | findstr :${port}`);
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        if (/\sLISTENING\s/.test(line)) {
          const parts = line.trim().split(/\s+/);
          const pid = Number(parts.at(-1));
          if (Number.isFinite(pid)) return pid;
        }
      }
    } else {
      // Try lsof first (most common)
      try {
        const { stdout } = await px(`lsof -i :${port} -sTCP:LISTEN -t 2>/dev/null || true`);
        const pid = Number(stdout.trim());
        if (Number.isFinite(pid) && pid > 0) return pid;
      } catch {
        // lsof not available, try ss (Alpine/containers)
        try {
          const { stdout } = await px(`ss -tlnp | grep :${port} || true`);
          const match = stdout.match(/pid=(\d+)/);
          if (match) {
            const pid = Number(match[1]);
            if (Number.isFinite(pid)) return pid;
          }
        } catch {
          // Both tools unavailable, rely on Node probe
        }
      }
    }
  } catch (e) {
    warn("findPidOnPort error:", (e as Error)?.message);
  }
  return null;
}

async function waitForPortFree(port: number, attempts = 10): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    if (!(await probePortWithNode(port))) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Port ${port} stuck in use after ${attempts} attempts.`);
}

async function killProcessOnPort(port: number) {
  // Skip in Docker - let orchestrator handle it
  if (isDocker) {
    log(`Running in Docker; skipping OS-level port kill for ${port}`);
    return;
  }

  log(`Checking for processes on port ${port}...`);
  const pid = await findPidOnPort(port);
  if (!pid) {
    log(`No process found on port ${port}`);
    return;
  }
  
  warn(`Port ${port} in use by PID ${pid}. Terminating...`);
  await killPid(pid);
  log(`Killed PID ${pid}, waiting for port to free...`);
  
  // Wait for kernel to release port
  await waitForPortFree(port);
  log(`Port ${port} is free.`);
}

// Multi-port fallback
export async function reservePort(preferred = 8081, max = 8090): Promise<number> {
  log(`Reserving port starting from ${preferred}...`);
  for (let p = preferred; p <= max; p++) {
    if (!(await probePortWithNode(p))) {
      log(`Port ${p} is available`);
      return p;
    }
  }
  throw new Error(`No free port in range ${preferred}-${max}`);
}

// Comprehensive port freeing with retry
export async function ensurePortFree(port: number): Promise<void> {
  try {
    await killProcessOnPort(port);
  } catch (e) {
    warn("Port kill failed:", String(e));
  }
  await waitForPortFree(port);
}

function attachServer(server: Server) {
  attachedServer = server;
  server.on("connection", (socket) => {
    activeSockets.add(socket);
    socket.on("close", () => activeSockets.delete(socket));
  });
}

async function gracefulCloseServer(timeoutMs = 2000) {
  if (!attachedServer) return;
  log("Closing HTTP server gracefully...");
  
  const closePromise = new Promise<void>((resolve) => {
    attachedServer!.close(() => resolve());
  });
  
  const timer = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  
  const result = await Promise.race([closePromise, timer]);
  
  if (result === undefined) {
    warn(`Graceful close timed out after ${timeoutMs}ms. Destroying ${activeSockets.size} open sockets.`);
    for (const s of activeSockets) {
      try {
        if (typeof (s as any).destroySoon === "function") {
          (s as any).destroySoon();
        } else {
          s.destroy();
        }
      } catch {}
    }
  } else {
    log("HTTP server closed gracefully");
  }
}

async function cleanupAndExit(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("Shutting down...");
  
  try {
    await gracefulCloseServer();
  } catch (e) {
    warn("Error during server close:", (e as Error)?.message);
  }
  
  try {
    await removePidFile();
    log("PID file removed.");
  } catch {}
  
  process.exit(code);
}

function registerSignalHandlers() {
  const onSig = (sig: NodeJS.Signals) => async () => {
    log(`Received ${sig}.`);
    await cleanupAndExit(0);
  };
  
  // Standard signals
  ["SIGINT", "SIGTERM", "SIGHUP"].forEach((s) => {
    try {
      process.on(s as NodeJS.Signals, onSig(s as NodeJS.Signals));
    } catch {
      // Signal may not exist on this platform
    }
  });
  
  // Windows-specific SIGBREAK
  try {
    process.on("SIGBREAK" as NodeJS.Signals, onSig("SIGBREAK" as NodeJS.Signals));
  } catch {
    // SIGBREAK only exists on Windows
  }

  process.on("uncaughtException", async (e) => {
    err("uncaughtException:", e);
    await cleanupAndExit(1);
  });

  process.on("unhandledRejection", async (e) => {
    err("unhandledRejection:", e);
    await cleanupAndExit(1);
  });

  process.on("beforeExit", async () => {
    await removePidFile();
  });
}

export const ProcessManager = {
  /**
   * Remove stale PID file and kill orphaned process (if truly running).
   * Includes PID reuse protection via signature validation.
   */
  async checkForStaleProcess() {
    log("Checking for stale process...");
    const meta = await readPidMeta();
    
    if (!meta?.pid) {
      log("No stale processes found.");
      return;
    }

    if (!procExists(meta.pid)) {
      log(`Stale PID file found (pid ${meta.pid}) but process is not running. Cleaning up.`);
      await removePidFile();
      return;
    }

    // Don't kill if it's this current process
    if (meta.pid === process.pid) {
      log("PID file points to current process; leaving it.");
      return;
    }

    // PID reuse protection: check signature
    const currentSig = createSignature();
    if (meta.signature && meta.signature !== currentSig) {
      warn(
        `PID ${meta.pid} exists but signature differs (expected: ${currentSig}, got: ${meta.signature}).`,
        `Skipping kill to avoid collateral damage. Manual cleanup may be needed.`
      );
      return;
    }

    warn(`Found running process from previous session (PID ${meta.pid}). Terminating...`);
    await killPid(meta.pid);
    await removePidFile();
    log("Stale process cleaned up.");
  },

  /**
   * Initialize current process with PID tracking and signal handlers.
   * Idempotent across hot reloads.
   */
  async initialize({ portHint }: { portHint?: number } = {}) {
    if (initialized) {
      log("Already initialized.");
      return;
    }
    initialized = true;

    const meta: PidMeta = {
      pid: process.pid,
      startedAt: Date.now(),
      cmd: process.argv.join(" "),
      portHint,
      signature: createSignature(),
    };

    log("Initializing...");
    await writePidMeta(meta);
    registerSignalHandlers();
    log(`Initialized with PID: ${process.pid}`);
    
    if (isDocker) {
      log("Running in Docker container");
    }
  },

  /**
   * Ensure a port is free before starting the server.
   * Includes retry logic for TIME_WAIT scenarios.
   */
  async killProcessOnPort(port: number) {
    await killProcessOnPort(port);
  },

  /**
   * Comprehensive port freeing with retry and validation.
   */
  async ensurePortFree(port: number) {
    await ensurePortFree(port);
  },

  /**
   * Find and reserve a free port in the given range.
   */
  async reservePort(preferred: number, max: number) {
    return await reservePort(preferred, max);
  },

  /**
   * Attach an http.Server to enable graceful shutdown & socket draining.
   */
  withHttpServer(server: Server) {
    attachServer(server);
    return this;
  },
};
