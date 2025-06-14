import { jest } from "@jest/globals";

// Mock the spawn function before importing the module under test
const mockSpawn = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  spawn: mockSpawn,
}));

// Mock AWS SDK
const mockSend = jest.fn();
const mockECSClient = jest.fn(() => ({
  send: mockSend,
}));

jest.unstable_mockModule("@aws-sdk/client-ecs", () => ({
  ECSClient: mockECSClient,
  ListClustersCommand: jest.fn(),
  ListServicesCommand: jest.fn(),
  ListTasksCommand: jest.fn(),
  DescribeTasksCommand: jest.fn(),
}));

// Mock inquirer
const mockSearch = jest.fn();
jest.unstable_mockModule("@inquirer/search", () => ({
  default: mockSearch,
  Separator: jest.fn(),
}));

// Mock process.exit to prevent actual exits during tests
const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {});

// Now import the modules
const { checkPrerequisites } = await import("../src/prerequisites.js");
const { promptTasks } = await import("../src/prompts.js");

// Mock console.error and console.log to capture output
let consoleErrorSpy;
let consoleLogSpy;

describe("Integration Tests - Full Workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpawn.mockClear();
    mockSend.mockClear();
    mockSearch.mockClear();
    mockExit.mockClear();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("Task Selection with Execute Command Validation", () => {
    it("should successfully return task when execute command is enabled", async () => {
      // Mock AWS API responses
      mockSend
        .mockResolvedValueOnce({
          taskArns: ["arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123"],
        })
        .mockResolvedValueOnce({
          tasks: [
            {
              taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123",
              taskDefinitionArn:
                "arn:aws:ecs:us-east-1:123456789012:task-definition/app:1",
              startedAt: new Date("2023-01-01T12:00:00Z"),
              enableExecuteCommand: true,
            },
          ],
        });

      const result = await promptTasks("test-cluster", "test-service");

      expect(result.enableExecuteCommand).toBe(true);
      expect(mockExit).not.toHaveBeenCalled();
    });

    it("should exit when single task does not have execute command enabled", async () => {
      // Mock AWS API responses
      mockSend
        .mockResolvedValueOnce({
          taskArns: ["arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123"],
        })
        .mockResolvedValueOnce({
          tasks: [
            {
              taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123",
              taskDefinitionArn:
                "arn:aws:ecs:us-east-1:123456789012:task-definition/app:1",
              startedAt: new Date("2023-01-01T12:00:00Z"),
              enableExecuteCommand: false,
            },
          ],
        });

      await promptTasks("test-cluster", "test-service");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "✗ Task cluster/abc123 does not have execute command enabled"
        )
      );
    });

    it("should show execute command status in task selection", async () => {
      // Mock AWS API responses with multiple tasks
      mockSend
        .mockResolvedValueOnce({
          taskArns: [
            "arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123",
            "arn:aws:ecs:us-east-1:123456789012:task/cluster/def456",
          ],
        })
        .mockResolvedValueOnce({
          tasks: [
            {
              taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123",
              taskDefinitionArn:
                "arn:aws:ecs:us-east-1:123456789012:task-definition/app:1",
              startedAt: new Date("2023-01-01T12:00:00Z"),
              enableExecuteCommand: true,
            },
            {
              taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/def456",
              taskDefinitionArn:
                "arn:aws:ecs:us-east-1:123456789012:task-definition/app:2",
              startedAt: new Date("2023-01-01T13:00:00Z"),
              enableExecuteCommand: false,
            },
          ],
        });

      // Mock user selecting the first task (with execute command enabled)
      mockSearch.mockResolvedValue({
        taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123",
        enableExecuteCommand: true,
      });

      const result = await promptTasks("test-cluster", "test-service");

      // Verify that the task selection choices include execute command status
      expect(mockSearch).toHaveBeenCalledWith({
        message: "Task:",
        source: expect.any(Function),
      });

      expect(result.enableExecuteCommand).toBe(true);
      expect(mockExit).not.toHaveBeenCalled();
    });

    it("should exit when user selects task without execute command", async () => {
      // Mock AWS API responses with multiple tasks
      mockSend
        .mockResolvedValueOnce({
          taskArns: [
            "arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123",
            "arn:aws:ecs:us-east-1:123456789012:task/cluster/def456",
          ],
        })
        .mockResolvedValueOnce({
          tasks: [
            {
              taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/abc123",
              taskDefinitionArn:
                "arn:aws:ecs:us-east-1:123456789012:task-definition/app:1",
              startedAt: new Date("2023-01-01T12:00:00Z"),
              enableExecuteCommand: true,
            },
            {
              taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/def456",
              taskDefinitionArn:
                "arn:aws:ecs:us-east-1:123456789012:task-definition/app:2",
              startedAt: new Date("2023-01-01T13:00:00Z"),
              enableExecuteCommand: false,
            },
          ],
        });

      // Mock user selecting the second task (without execute command)
      mockSearch.mockResolvedValue({
        taskArn: "arn:aws:ecs:us-east-1:123456789012:task/cluster/def456",
        enableExecuteCommand: false,
      });

      await promptTasks("test-cluster", "test-service");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "✗ Task cluster/def456 does not have execute command enabled"
        )
      );
    });
  });

  describe("Error Scenarios", () => {
    it("should handle no tasks found", async () => {
      mockSend.mockResolvedValueOnce({
        taskArns: [],
      });

      await expect(promptTasks("test-cluster", "test-service")).rejects.toThrow(
        "No tasks found"
      );
    });

    it("should handle malformed task ARNs gracefully", async () => {
      mockSend
        .mockResolvedValueOnce({
          taskArns: ["malformed-arn"],
        })
        .mockResolvedValueOnce({
          tasks: [
            {
              taskArn: "malformed-arn",
              taskDefinitionArn: "malformed-task-def",
              startedAt: new Date("2023-01-01T12:00:00Z"),
              enableExecuteCommand: false,
            },
          ],
        });

      await promptTasks("test-cluster", "test-service");

      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "✗ Task malformed-arn does not have execute command enabled"
        )
      );
    });
  });
});
