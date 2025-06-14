import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import yargs from "yargs/yargs";
import search from "@inquirer/search";
import chalk from "chalk";
import {
  hasExecuteCommandEnabled,
  displayExecuteCommandError,
} from "./prerequisites.js";

const client = new ECSClient();

export async function promptClusters() {
  const command = new ListClustersCommand({
    // nextToken: "STRING_VALUE",
    maxResults: 100,
  });
  const response = await client.send(command);

  if (response.clusterArns.length === 0) {
    throw new Error("No clusters found");
  }

  const choices = response.clusterArns.map((arn) => ({
    name: arn.split(":").pop().replace("cluster/", ""),
    value: arn,
  }));

  return await searchableSelect("Cluster:", choices);
}

export async function promptServices(cluster) {
  const command = new ListServicesCommand({
    cluster: cluster,
    // nextToken: "STRING_VALUE",
    maxResults: 100,
  });
  const response = await client.send(command);

  const choices = response.serviceArns.map((arn) => ({
    name: arn.split(":").pop().replace("service/", ""),
    value: arn,
  }));

  return await searchableSelect("Service:", choices);
}

export async function promptTasks(cluster, service) {
  const command = new ListTasksCommand({
    serviceName: service,
    cluster,
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

  const choices = fullTaskResp.tasks.map((t, i) => ({
    name: fmtTaskName(t, i),
    value: t,
  }));

  const selectedTask = await searchableSelect("Task:", choices);

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

  const choices = containers.map((container) => ({
    value: container.name,
    name: container.name,
  }));

  return await searchableSelect("Container:", choices);
}

async function searchableSelect(message, choices) {
  return await search({
    message,
    source: async (input) => {
      if (!input) {
        return choices;
      }

      return choices.filter((choice) => {
        const arn = choice.name.toLowerCase();
        const search = input.toLowerCase();
        return arn.includes(search);
      });
    },
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
