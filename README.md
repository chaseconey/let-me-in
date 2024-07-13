<p align="center">
  <img src="./let-me-in.jpg" />
</p>

# let-me-in

A CLI tool to easily SSH into an ECS container using SSM Session Manager.

[![asciicast](./demo.gif)](https://asciinema.org/a/ao7mlvJMdkfon36QhInqBK78I)

## Pre-requisites

To use this tool, you will need:

- the [AWS CLI](https://aws.amazon.com/cli/) installed on your machine (if you are executing the command)
- the [Session Manager plugin for the CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) installed
- your task/service to have the `enable-execute-command` flag set

## Quickstart

```
npx @chaseconey/let-me-in
```

This will prompt you through your clusters, services, tasks, and containers to give you the appropriate destination.

### Example Usage

There are quite a few options that you can pass to streamline connecting to your container. Here are a few examples:

#### Passing Cluster and Service Name

```
npx @chaseconey/let-me-in -c prod -s app-prod-1
```

This will skip prompting for the cluster and service and move on to the task selection automatically.

Additionally, if there is only 1 task and 1 container, it will assume that is what you want and move on.

#### Changing the Target Region

```
npx @chaseconey/let-me-in -r us-west-2
```

This will search for resources in the `us-west-2` region. For a list of available regions, check out the [AWS docs](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/).

#### Printing, Rather than Executing

Sometimes, you may want to get the full AWS CLI command with all the identifiers filled in rather than executing the interactive shell. This can be useful if you need to log in multiple times and don't want to go through the questions repeatedly. It can also be helpful if you want to hand the command over to someone else to use.

```
npx @chaseconey/let-me-in --print
```

### AWS Credential Handling

This CLI uses the AWS Javascript SDK, which uses the normal "AWS Credential Provider Chain". This means it will try and load the credentials in many different ways but in a specific order.

For more details, check out the [AWS docs](https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html#credentials-default).

> [!NOTE]  
> We provide passing the `profile` using the `-p` or `--profile` flags.
