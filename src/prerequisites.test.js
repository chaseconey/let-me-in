import { jest } from "@jest/globals";

// Mock the spawn function before importing the module under test
const mockSpawn = jest.fn();
jest.unstable_mockModule("child_process", () => ({
  spawn: mockSpawn,
}));

// Now import the module under test
const {
  checkAwsCli,
  checkSessionManagerPlugin,
  hasExecuteCommandEnabled,
  checkPrerequisites,
  displayAwsCliError,
  displaySessionManagerPluginError,
  displayExecuteCommandError,
} = await import("../src/prerequisites.js");

// Mock console.error to capture output
const originalConsoleError = console.error;
let consoleErrorSpy;

describe("Prerequisites Module", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSpawn.mockClear();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("checkAwsCli", () => {
    it("should return true when AWS CLI is installed", async () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0); // Exit code 0 means success
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkAwsCli();

      expect(mockSpawn).toHaveBeenCalledWith("aws", ["--version"], {
        stdio: "pipe",
      });
      expect(result).toBe(true);
    });

    it("should return false when AWS CLI is not installed", async () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(1); // Exit code 1 means failure
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkAwsCli();

      expect(mockSpawn).toHaveBeenCalledWith("aws", ["--version"], {
        stdio: "pipe",
      });
      expect(result).toBe(false);
    });

    it("should return false when spawn throws an error", async () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "error") {
            callback(new Error("Command not found"));
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkAwsCli();

      expect(result).toBe(false);
    });
  });

  describe("checkSessionManagerPlugin", () => {
    it("should return true when Session Manager plugin is installed", async () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0); // Exit code 0 means success
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkSessionManagerPlugin();

      expect(mockSpawn).toHaveBeenCalledWith(
        "aws",
        ["ssm", "start-session", "help"],
        { stdio: "pipe" }
      );
      expect(result).toBe(true);
    });

    it("should return false when Session Manager plugin is not installed", async () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(1); // Exit code 1 means failure
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkSessionManagerPlugin();

      expect(mockSpawn).toHaveBeenCalledWith(
        "aws",
        ["ssm", "start-session", "help"],
        { stdio: "pipe" }
      );
      expect(result).toBe(false);
    });

    it("should return false when spawn throws an error", async () => {
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "error") {
            callback(new Error("Command not found"));
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkSessionManagerPlugin();

      expect(result).toBe(false);
    });
  });

  describe("hasExecuteCommandEnabled", () => {
    it("should return true when task has enableExecuteCommand set to true", () => {
      const task = {
        taskArn: "arn:aws:ecs:us-east-1:123456789012:task/my-cluster/abc123",
        enableExecuteCommand: true,
      };

      const result = hasExecuteCommandEnabled(task);

      expect(result).toBe(true);
    });

    it("should return false when task has enableExecuteCommand set to false", () => {
      const task = {
        taskArn: "arn:aws:ecs:us-east-1:123456789012:task/my-cluster/abc123",
        enableExecuteCommand: false,
      };

      const result = hasExecuteCommandEnabled(task);

      expect(result).toBe(false);
    });

    it("should return false when task does not have enableExecuteCommand property", () => {
      const task = {
        taskArn: "arn:aws:ecs:us-east-1:123456789012:task/my-cluster/abc123",
      };

      const result = hasExecuteCommandEnabled(task);

      expect(result).toBe(false);
    });

    it("should return false when enableExecuteCommand is null", () => {
      const task = {
        taskArn: "arn:aws:ecs:us-east-1:123456789012:task/my-cluster/abc123",
        enableExecuteCommand: null,
      };

      const result = hasExecuteCommandEnabled(task);

      expect(result).toBe(false);
    });
  });

  describe("checkPrerequisites", () => {
    it("should return true when all prerequisites are met", async () => {
      // Mock both checks to return true
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callback(0); // Success
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkPrerequisites();

      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledTimes(2); // AWS CLI and Session Manager plugin
    });

    it("should return false when AWS CLI is not installed", async () => {
      let callCount = 0;
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callCount++;
            if (callCount === 1) {
              callback(1); // AWS CLI fails
            } else {
              callback(0); // Session Manager would succeed, but won't reach here
            }
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkPrerequisites();

      expect(result).toBe(false);
      expect(mockSpawn).toHaveBeenCalledTimes(1); // Should stop after AWS CLI check fails
    });

    it("should return false when Session Manager plugin is not installed", async () => {
      let callCount = 0;
      const mockChild = {
        on: jest.fn((event, callback) => {
          if (event === "close") {
            callCount++;
            if (callCount === 1) {
              callback(0); // AWS CLI succeeds
            } else {
              callback(1); // Session Manager fails
            }
          }
        }),
      };
      mockSpawn.mockReturnValue(mockChild);

      const result = await checkPrerequisites();

      expect(result).toBe(false);
      expect(mockSpawn).toHaveBeenCalledTimes(2); // Both checks should run
    });
  });

  describe("displayAwsCliError", () => {
    it("should display AWS CLI installation error message", () => {
      displayAwsCliError();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("✗ AWS CLI is not installed or not accessible")
      );
    });
  });

  describe("displaySessionManagerPluginError", () => {
    it("should display Session Manager plugin installation error message", () => {
      displaySessionManagerPluginError();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("✗ Session Manager plugin is not installed")
      );
    });
  });

  describe("displayExecuteCommandError", () => {
    it("should display execute command error message with task name", () => {
      const taskName = "abc123def456";

      displayExecuteCommandError(taskName);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `✗ Task ${taskName} does not have execute command enabled`
        )
      );
    });
  });
});
