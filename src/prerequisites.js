import { spawn } from "child_process";
import chalk from "chalk";
import { homedir } from "os";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

/**
 * Get the cache directory path
 */
function getCacheDir() {
  const cacheDir = join(homedir(), ".cache", "let-me-in");
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

/**
 * Get the cache file path
 */
function getCacheFilePath() {
  return join(getCacheDir(), "prerequisites-cache.json");
}

/**
 * Check if the cache is valid (not older than 1 week)
 */
function isCacheValid(cacheData) {
  const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  const now = Date.now();
  return now - cacheData.timestamp < oneWeekInMs;
}

/**
 * Load cache from file
 */
function loadCache() {
  try {
    const cacheFilePath = getCacheFilePath();
    if (!existsSync(cacheFilePath)) {
      return null;
    }
    const cacheData = JSON.parse(readFileSync(cacheFilePath, "utf8"));
    return isCacheValid(cacheData) ? cacheData : null;
  } catch (error) {
    // If cache is corrupted, ignore it
    return null;
  }
}

/**
 * Save cache to file
 */
function saveCache() {
  try {
    const cacheData = {
      timestamp: Date.now(),
      prerequisitesPassed: true,
    };
    const cacheFilePath = getCacheFilePath();
    writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    // Silently ignore cache save errors
  }
}

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
  // Check if we have a valid cache
  const cachedResult = loadCache();
  if (cachedResult && cachedResult.prerequisitesPassed) {
    console.log(chalk.green("✓ Prerequisites check passed (cached)"));
    return true;
  }

  console.log(chalk.dim("Checking prerequisites..."));

  const awsCliInstalled = await checkAwsCli();
  if (!awsCliInstalled) {
    displayAwsCliError();
    return false;
  }

  console.log(chalk.green("✓ AWS CLI is installed"));

  const sessionManagerInstalled = await checkSessionManagerPlugin();
  if (!sessionManagerInstalled) {
    displaySessionManagerPluginError();
    return false;
  }

  console.log(chalk.green("✓ Session Manager plugin is installed"));

  // Save successful check to cache
  saveCache();

  return true;
}
