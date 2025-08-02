const { spawn } = require("child_process");
const electron = require("electron");
let child;

function startElectron() {
  if (child) child.kill(); // Kill existing instance
  child = spawn(electron, ["."], { stdio: "inherit" });
}

startElectron();

process.on("SIGINT", () => {
  if (child) child.kill();
  process.exit();
});
