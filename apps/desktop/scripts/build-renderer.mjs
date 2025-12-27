import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

const child = spawn(
  npmCmd,
  ["run", "-w", "@openvisionmatrix/pwa", "build"],
  {
    stdio: "inherit",
    env: { ...process.env, BASE_PATH: "./" }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
