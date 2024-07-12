#!/usr/bin/env node

import yargs from "yargs/yargs";
import {
  promptClusters,
  promptServices,
  promptTasks,
  promptContainers,
} from "./prompts.js";
import { spawn } from "child_process";
import chalk from "chalk";

const argv = yargs(process.argv.slice(2))
  .options({
    r: {
      type: "string",
      default: "us-east-1",
      alias: "region",
      describe: "AWS Region to search",
    },
    c: {
      type: "string",
      alias: "cluster",
      describe: "ECS Cluster Name or ARN, used to short-circuit lookup",
    },
    s: {
      type: "string",
      alias: "service",
      describe: "ECS Service Name or ARN, used to short-circuit lookup",
    },
    p: {
      type: "boolean",
      alias: "print",
      default: false,
      describe: "Print command instead of executing",
    },
    container: {
      type: "string",
      describe:
        "Container Name to exec into; only required if multiple containers are present in the task",
    },
    command: {
      type: "string",
      describe: "Command to execute in the container",
      default: "/bin/sh",
    },
  })
  .help()
  .alias("h", "help")
  .showHelpOnFail(true)
  .parse();

// Set region
process.env.AWS_REGION = argv.region;

// Get clusters
let cluster;
try {
  if (!cluster) {
    cluster = argv.cluster ?? (await promptClusters());
  }
} catch (e) {
  console.error(chalk.red(e.message));
  process.exit(1);
}

// Get all services for selected cluster
const service = argv.service ?? (await promptServices(cluster));

// Get all tasks for selected service
const task = await promptTasks(cluster, service);

// Get all containers for selected task
const container = argv.container ?? (await promptContainers(cluster, task));

// Get into task with SSM
// Example: aws ecs execute-command --cluster prod --task $(codecov-prod-task-id) --container ${2:-api} --interactive --command ${1:-"/bin/bash"}
const cmd = `aws ecs execute-command --cluster ${cluster} --task ${task} --container ${container} --interactive --command ${argv.command}`;

if (argv.print) {
  console.log(cmd);
  process.exit(0);
}

const shell = spawn(cmd, [], { stdio: "inherit", shell: true });

shell.on("close", (code) => {
  console.log("[shell] terminated :", code);
  process.exit(code);
});
