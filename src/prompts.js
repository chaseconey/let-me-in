import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs";
import yargs from "yargs/yargs";
import select from "@inquirer/select";

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

  return await select({
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

  return await select({
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
    return response.tasks[0];
  }

  return await select({
    message: "Task:",
    choices: fullTaskResp.tasks.map((t, i) => ({
      name: fmtTaskName(t, i),
      value: t,
    })),
  });
}

export async function promptContainers(task) {
  const containers = task.containers;

  if (containers.length === 0) {
    throw new Error("No containers found");
  }

  if (containers.length === 1) {
    return containers[0].name;
  }

  return await select({
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
  const startedAt = new Date(task.startedAt).toISOString();

  return `#${index + 1} ${taskId} (v${version}) started at ${startedAt}`;
}
