import { spawn } from "child_process";
import chalk from "chalk";

/**
 * Check if AWS CLI is installed and accessible
 */
export async function checkAwsCli() {
  return checkCommand("aws", ["--version"]);
}

/**
 * Check if Session Manager plugin is installed
 */
export async function checkSessionManagerPlugin() {
  return checkCommand("aws", ["ssm", "start-session", "help"]);
}

/**
 * Check if a task has enable-execute-command flag set
 */
export function hasExecuteCommandEnabled(task) {
  return task.enableExecuteCommand === true;
}

/**
 * Generic function to check if a command is available
 */
async function checkCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "pipe" });

    child.on("close", (code) => {
      resolve(code === 0);
    });

    child.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Display error message for missing AWS CLI
 */
export function displayAwsCliError() {
  console.error(`${chalk.red("✗ AWS CLI is not installed or not accessible")}

To use this tool, you need to install the AWS CLI:
${chalk.blue("https://aws.amazon.com/cli/")}

Installation options:
• macOS: brew install awscli
• Windows: Download installer from AWS
• Linux: pip install awscli`);
}

/**
 * Display error message for missing Session Manager plugin
 */
export function displaySessionManagerPluginError() {
  console.error(`${chalk.red("✗ Session Manager plugin is not installed")}

To use this tool, you need to install the Session Manager plugin:
${chalk.blue(
  "https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html"
)}

Installation options:
• macOS: Download and install the .pkg file
• Windows: Download and run the .msi installer
• Linux: Download and install the .deb or .rpm package`);
}

/**
 * Display error message for task without execute command enabled
 */
export function displayExecuteCommandError(taskName) {
  console.error(`${chalk.red(
    `✗ Task ${taskName} does not have execute command enabled`
  )}

To connect to this task, the ECS service or task definition needs to have
the 'enable-execute-command' flag set to true.

You can enable this by:
• Updating your ECS service with --enable-execute-command flag
• Or updating your task definition and redeploying

AWS CLI example:
${chalk.dim(
  "aws ecs update-service --cluster CLUSTER --service SERVICE --enable-execute-command"
)}`);
}

/**
 * Run all prerequisite checks
 */
export async function checkPrerequisites() {
  console.log(chalk.dim("Checking prerequisites..."));

  const awsCliInstalled = await checkAwsCli();
  if (!awsCliInstalled) {
    displayAwsCliError();
    return false;
  }

  const sessionManagerInstalled = await checkSessionManagerPlugin();
  if (!sessionManagerInstalled) {
    displaySessionManagerPluginError();
    return false;
  }

  console.log(chalk.green("✓ Prerequisites check passed"));
  return true;
}
