import { spawn } from "node:child_process";

const npmCmd = "npm";

const child = spawn(
  npmCmd,
  ["run", "-w", "@openvisionmatrix/pwa", "build"],
  {
    stdio: "inherit",
    env: { ...process.env, BASE_PATH: "./" },
    shell: true,
    windowsHide: true
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
