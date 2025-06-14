import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import yargs from "yargs/yargs";
import select from "@inquirer/select";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import chalk from "chalk";
import {
  hasExecuteCommandEnabled,
  displayExecuteCommandError,
} from "./prerequisites.js";

const client = new ECSClient();

async function searchableSelect({ message, choices, ...rest }) {
  let filtered = choices;
  if (choices.length > 10) {
    const rl = readline.createInterface({ input, output });
    const term = (await rl.question(`Search ${message.toLowerCase()} (leave blank to show all): `)).trim();
    rl.close();
    if (term) {
      const q = term.toLowerCase();
      const results = choices.filter((c) => {
        const name = typeof c === "string" ? c : c.name ?? "";
        return name.toLowerCase().includes(q);
      });
      if (results.length > 0) {
        filtered = results;
      } else {
        console.log(chalk.yellow("No matches found, showing all choices."));
      }
    }
  }
  return select({ message, choices: filtered, ...rest });
}

export async function promptClusters() {
  const command = new ListClustersCommand({
    // nextToken: "STRING_VALUE",
    maxResults: 100,
  });
  const response = await client.send(command);

  if (response.clusterArns.length === 0) {
    throw new Error("No clusters found");
  }

  return searchableSelect({
    message: "Cluster:",
    choices: response.clusterArns.map((arn) => ({
      name: arn.split(":").pop().replace("cluster/", ""),
      value: arn,
    })),
  });
}

export async function promptServices(cluster) {
  const command = new ListServicesCommand({
    cluster: cluster,
    // nextToken: "STRING_VALUE",
    maxResults: 100,
  });
  const response = await client.send(command);

  return searchableSelect({
    message: "Service:",
    choices: response.serviceArns.map((arn) => ({
      name: arn.split(":").pop().replace("service/", ""),
      value: arn,
    })),
  });
}

export async function promptTasks(cluster, service) {
  const command = new ListTasksCommand({
    serviceName: service,
    cluster,
    // nextToken: "STRING_VALUE",
    maxResults: 100,
  });
  const response = await client.send(command);

  if (response.taskArns.length === 0) {
    throw new Error("No tasks found");
  }

  const fullTaskCommand = new DescribeTasksCommand({
    cluster,
    tasks: response.taskArns,
  });
  const fullTaskResp = await client.send(fullTaskCommand);

  if (fullTaskResp.tasks.length === 1) {
    const task = fullTaskResp.tasks[0];
    return validateTaskExecuteCommand(task);
  }

  const selectedTask = await searchableSelect({
    message: "Task:",
    choices: fullTaskResp.tasks.map((t, i) => ({
      name: fmtTaskName(t, i),
      value: t,
    })),
  });

  return validateTaskExecuteCommand(selectedTask);
}

export async function promptContainers(task) {
  const containers = task.containers;

  if (containers.length === 0) {
    throw new Error("No containers found");
  }

  if (containers.length === 1) {
    return containers[0].name;
  }

  return searchableSelect({
    message: "Container:",
    choices: containers.map((container) => ({
      value: container.name,
    })),
  });
}

function fmtTaskName(task, index) {
  const taskId = task.taskArn.split(":").pop().replace("task/", "");
  const version = task.taskDefinitionArn
    .split(":")
    .pop()
    .replace("task-definition/", "");
  const startedAt = new Date(task.startedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const executeCommandStatus = hasExecuteCommandEnabled(task)
    ? chalk.green("✓ exec enabled")
    : chalk.red("✗ exec disabled");

  return `#${
    index + 1
  } ${taskId} (v${version}) ${executeCommandStatus} - started ${startedAt}`;
}

function validateTaskExecuteCommand(task) {
  if (!hasExecuteCommandEnabled(task)) {
    const taskId = task.taskArn.split(":").pop().replace("task/", "");
    displayExecuteCommandError(taskId);
    process.exit(1);
  }
  return task;
}
