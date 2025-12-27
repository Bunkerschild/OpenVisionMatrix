import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const appDir = join(root, "..", "..", "..");
const distMain = join(appDir, "apps", "desktop", "dist", "main.js");
const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const npxCmd = isWindows ? "npx.cmd" : "npx";

const run = (cmd, args, env) => {
  const child = spawn(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    cwd: appDir
  });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });
  return child;
};

run(npmCmd, ["run", "-w", "@openvisionmatrix/pwa", "dev", "--", "--host"], {
  BROWSER: "none"
});

run(npmCmd, ["run", "-w", "@openvisionmatrix/desktop", "build:main", "--", "--watch"], {});

const waitForMain = () => new Promise((resolve) => {
  const check = () => {
    if (existsSync(distMain)) return resolve();
    setTimeout(check, 200);
  };
  check();
});

await waitForMain();

run(npxCmd, ["electron", distMain], {
  OVM_DEV_SERVER_URL: "http://localhost:5173"
});
