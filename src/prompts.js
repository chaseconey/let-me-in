import {
  ECSClient,
  ListClustersCommand,
  ListServicesCommand,
  ListTasksCommand,
  DescribeTasksCommand,
} from "@aws-sdk/client-ecs"; // ES Modules import
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

  if (response.taskArns.length === 1) {
    return response.taskArns[0];
  }

  return await select({
    message: "Task:",
    choices: response.taskArns.map((arn) => ({
      name: arn.split(":").pop().replace("task/", ""),
      value: arn,
    })),
  });
}

export async function promptContainers(cluster, task) {
  const command = new DescribeTasksCommand({
    cluster,
    tasks: [task],
  });
  const response = await client.send(command);

  const containers = response.tasks[0].containers;

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
