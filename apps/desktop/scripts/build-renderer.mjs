import { spawn } from "node:child_process";

const child = spawn(
  "npm",
  ["run", "-w", "@openvisionmatrix/pwa", "build"],
  {
    stdio: "inherit",
    env: { ...process.env, BASE_PATH: "./" }
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
