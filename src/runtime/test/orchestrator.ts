/**
 * Test orchestrator.
 * Coordinates contract loading, sandboxed execution, and rule evaluation.
 */

import * as path from 'path';
import * as fs from 'fs';
import { loadConfig } from '@/config/loader';
import type { SyrinConfig } from '@/config/types';
import { loadAllContracts } from './contract-loader';
import { SandboxExecutor, ToolExecutionErrorType } from '@/runtime/sandbox';
import { IOMonitor } from '@/runtime/sandbox';
import { BehaviorObserver } from './behavior-observer';
import { runContractTests, type TestExecutionResult } from './runner';
import { validateOutputStructure } from './output-validator';
import { parseTimeString } from '@/runtime/sandbox';
// Error rule imports - these provide diagnostic generation methods
// Note: Error codes are centralized in ERROR_CODES/ERROR_TYPE_TO_CODE below
// to maintain a single source of truth. Individual error classes provide
// rule-specific diagnostic creation via checkWithBehavioralContext methods.
import { E000ToolNotFound } from '@/runtime/analysis/rules/errors/e000-tool-not-found';
import { E500SideEffectDetected } from '@/runtime/analysis/rules/errors/e500-side-effect-detected';
import { E301OutputExplosion } from '@/runtime/analysis/rules/errors/e301-output-explosion';
import { E403UnboundedExecution } from '@/runtime/analysis/rules/errors/e403-unbounded-execution';
import { E300OutputValidationFailed } from '@/runtime/analysis/rules/errors/e300-output-validation-failed';
import { E200InputValidationFailed } from '@/runtime/analysis/rules/errors/e200-input-validation-failed';
import { E400ToolExecutionFailed } from '@/runtime/analysis/rules/errors/e400-tool-execution-failed';
import { E600UnexpectedTestResult } from '@/runtime/analysis/rules/errors/e600-unexpected-test-result';
// Centralized error code constants - single source of truth for error codes
import {
  ERROR_CODES,
  ERROR_TYPE_TO_CODE,
} from '@/runtime/analysis/rules/error-codes';
import {
  applyStrictMode,
  computeVerdict,
} from '@/runtime/analysis/strict-mode';
import type { Diagnostic } from '@/runtime/analysis/types';
import type { ToolContract, ParsedContract } from './contract-types';
import type { Command } from '@/types/ids';
import { logger } from '@/utils/logger';
import { ConfigurationError } from '@/utils/errors';

/**
 * Test execution options.
 */
export interface TestOrchestratorOptions {
  /** Project root directory */
  projectRoot: string;
  /** Tools directory (overrides config) */
  toolsDir?: string;
  /** Specific tool to test (if not provided, tests all) */
  toolName?: string;
  /** Path to filter tools (relative to tools directory, e.g., "weather" or "server") */
  toolPath?: string;
  /** Timeout in milliseconds (overrides config) */
  timeout?: number;
  /** Memory limit in MB (overrides config) */
  memoryLimitMB?: number;
  /** Max output size in KB (overrides config) */
  maxOutputSizeKB?: number;
  /** Number of determinism runs (overrides config) */
  determinismRuns?: number;
  /** Strict mode (treat warnings as errors) */
  strictMode?: boolean;
  /** CI mode (suppress verbose logging) */
  ci?: boolean;
  /** Show sandbox process error output (stderr from MCP server) */
  showErrors?: boolean;
  /** MCP command for stdio transport */
  mcpCommand?: Command | string;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Tool test result.
 */
export interface ToolTestResult {
  /** Tool name */
  toolName: string;
  /** Contract used */
  contract: ToolContract;
  /** Diagnostics from rules */
  diagnostics: Diagnostic[];
  /** Whether test passed */
  passed: boolean;
  /** Execution summary */
  summary: {
    /** Total number of executions (contract tests) */
    totalExecutions: number;
    /** Number of successful executions */
    successfulExecutions: number;
    /** Number of failed executions */
    failedExecutions: number;
    /** Number of timed out executions */
    timedOutExecutions: number;
    /** Number of contract tests that passed (matched expectations) */
    testsPassed?: number;
    /** Number of contract tests that failed (didn't match expectations) */
    testsFailed?: number;
  };
}

/**
 * Test orchestrator result.
 */
export interface TestOrchestratorResult {
  /** Overall verdict */
  verdict: 'pass' | 'fail' | 'pass-with-warnings';
  /** All diagnostics */
  diagnostics: Diagnostic[];
  /** Tool test results */
  toolResults: ToolTestResult[];
  /** Number of tools tested */
  toolsTested: number;
  /** Number of tools passed */
  toolsPassed: number;
  /** Number of tools failed */
  toolsFailed: number;
}

/**
 * Test orchestrator for tool validation.
 */
export class TestOrchestrator {
  private readonly options: TestOrchestratorOptions;

  constructor(options: TestOrchestratorOptions) {
    this.options = options;
  }

  /**
   * Extract expectedOutputSchema from TestExecutionResult.
   * @param result - Test execution result
   * @returns Expected output schema name, or undefined if not present
   */
  private getExpectedOutputSchema(
    result: TestExecutionResult
  ): string | undefined {
    return result.expectedOutputSchema;
  }

  /**
   * Run tool validation tests.
   */
  async run(): Promise<TestOrchestratorResult> {
    const { projectRoot, toolsDir, toolName, strictMode } = this.options;

    // Load configuration
    const config = loadConfig(projectRoot);

    // Determine tools directory (relative to project root)
    const finalToolsDir = toolsDir || config.check?.tools_dir || 'tools';
    const toolsDirPath = path.resolve(projectRoot, finalToolsDir);

    // Determine target directory for loading contracts
    let targetContractsDir: string = toolsDirPath;
    if (this.options.toolPath) {
      const pathFilter = this.options.toolPath.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
      const targetPath = path.resolve(toolsDirPath, pathFilter);

      // Verify the path exists
      if (!fs.existsSync(targetPath)) {
        throw new ConfigurationError(
          `Tool path not found: ${this.options.toolPath} (resolved to: ${targetPath})`
        );
      }
      if (!fs.statSync(targetPath).isDirectory()) {
        throw new ConfigurationError(
          `Tool path is not a directory: ${this.options.toolPath} (resolved to: ${targetPath})`
        );
      }

      // Only load contracts from the specified path
      targetContractsDir = targetPath;
    }

    // Load contracts from target directory (only the specified path if toolPath is provided)
    const parsedContracts: ParsedContract[] =
      loadAllContracts(targetContractsDir);

    const contracts: ToolContract[] = parsedContracts;

    // Filter by tool name if specified
    const contractsToTest = toolName
      ? contracts.filter(c => c.tool === toolName)
      : contracts;

    if (contractsToTest.length === 0) {
      if (toolName) {
        throw new ConfigurationError(`No contract found for tool: ${toolName}`);
      }
      throw new ConfigurationError(
        `No tool contracts found in ${toolsDirPath}. Create contract files (e.g., tools/<tool-name>.yaml).`
      );
    }

    // Get MCP command from config or options
    // For tool testing, we need to spawn the server regardless of transport type
    // (sandboxed execution requires spawning the process)
    const mcpCommand = this.options.mcpCommand || config.script;

    if (!mcpCommand) {
      throw new ConfigurationError(
        'MCP command is required for tool testing. Set script in syrin.yaml or use --mcp-command option.'
      );
    }

    // Initialize sandbox executor first (this starts the MCP server process)
    // Suppress stderr by default, unless user explicitly requests to see errors
    const suppressStderr = this.options.showErrors !== true;
    const sandboxExecutor = new SandboxExecutor({
      timeout: this.options.timeout || config.check?.timeout_ms || 30000,
      memoryLimitMB:
        this.options.memoryLimitMB || config.check?.memory_limit_mb,
      mcpCommand,
      env: this.options.env,
      projectRoot,
      suppressStderr,
    });

    try {
      // Initialize sandbox (start MCP server process once)
      await sandboxExecutor.initialize();

      // Get available tools from the sandbox executor's client
      // (reuse the same connection instead of creating a new one)
      const client = sandboxExecutor.getClient();
      if (!client) {
        throw new ConfigurationError(
          'Failed to get MCP client from sandbox executor'
        );
      }

      const availableTools = await client.listTools();

      // Create tool schema map
      const toolSchemaMap = new Map(
        availableTools.tools.map(tool => [
          tool.name,
          {
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
          },
        ])
      );

      const toolResults: ToolTestResult[] = [];
      const allDiagnostics: Diagnostic[] = [];

      // Test each contract
      for (const contract of contractsToTest) {
        const toolResult = await this.testTool(
          contract,
          toolSchemaMap,
          sandboxExecutor,
          projectRoot,
          config
        );
        toolResults.push(toolResult);
        allDiagnostics.push(...toolResult.diagnostics);
      }

      // Apply strict mode
      const processedDiagnostics = applyStrictMode(
        allDiagnostics,
        strictMode || config.check?.strict_mode || false
      );

      // Compute verdict
      const verdict = computeVerdict(
        processedDiagnostics,
        strictMode || config.check?.strict_mode || false
      );

      const toolsPassed = toolResults.filter(r => r.passed).length;
      const toolsFailed = toolResults.filter(r => !r.passed).length;

      return {
        verdict,
        diagnostics: processedDiagnostics,
        toolResults,
        toolsTested: toolResults.length,
        toolsPassed,
        toolsFailed,
      };
    } finally {
      // Cleanup sandbox (this also closes the MCP connection)
      await sandboxExecutor.cleanup();
    }
  }

  /**
   * Test a single tool.
   */
  private async testTool(
    contract: ToolContract,
    toolSchemaMap: Map<string, { inputSchema: unknown; outputSchema: unknown }>,
    sandboxExecutor: SandboxExecutor,
    projectRoot: string,
    config: SyrinConfig
  ): Promise<ToolTestResult> {
    const toolName = contract.tool;
    const toolSchema = toolSchemaMap.get(toolName);

    if (!toolSchema) {
      // Get the MCP command being used (from options or config)
      const mcpCommand = this.options.mcpCommand || config.script;
      const scriptName = mcpCommand ? String(mcpCommand) : 'unknown';
      if (!this.options.ci) {
        logger.warn(
          `Tool "${toolName}" not found in MCP server. Running: ${scriptName}`
        );
      }

      // Create a diagnostic error for missing tool using E000 rule
      const diagnostics = E000ToolNotFound.checkWithRuntimeContext({
        toolName,
        scriptName,
      });
      const diagnostic = diagnostics[0]!;

      return {
        toolName,
        contract,
        diagnostics: [diagnostic],
        passed: false,
        summary: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          timedOutExecutions: 0,
        },
      };
    }

    // Create I/O monitor
    const tempDir = sandboxExecutor.getTempDir() || '';
    const ioMonitor = new IOMonitor(tempDir, projectRoot);

    // Create behavior observer
    const behaviorObserver = new BehaviorObserver();

    // Parse per-tool timeout if declared, otherwise use global default
    let toolTimeoutMs: number | undefined;
    if (contract.guarantees?.max_execution_time) {
      try {
        toolTimeoutMs = parseTimeString(contract.guarantees.max_execution_time);
        if (!this.options.ci) {
          logger.info(
            `Tool "${toolName}" declared max_execution_time: ${contract.guarantees.max_execution_time} (${toolTimeoutMs}ms)`
          );
        }
      } catch (_error) {
        if (!this.options.ci) {
          logger.warn(
            `Invalid max_execution_time for tool "${toolName}": ${contract.guarantees.max_execution_time}. Using global default.`
          );
        }
      }
    }

    // Run contract-defined tests
    const contractTestResults = await runContractTests(
      sandboxExecutor,
      contract,
      toolTimeoutMs
    );

    // All results are from contract tests
    const allResults: TestExecutionResult[] = contractTestResults;

    // Run behavioral observations
    const sideEffectResult = behaviorObserver.detectSideEffects(
      ioMonitor,
      contract
    );
    const outputSizeResults = behaviorObserver.checkOutputSize(
      allResults,
      contract,
      this.options.maxOutputSizeKB || 50
    );
    const unboundedResult =
      behaviorObserver.detectUnboundedExecution(allResults);
    const executionErrorResult =
      behaviorObserver.detectExecutionErrors(allResults);

    // Run behavioral rules
    const diagnostics: Diagnostic[] = [];
    const testResults: Array<{
      testName?: string;
      passed: boolean;
      expected: 'success' | 'error' | 'unknown';
      actual: 'success' | 'error' | 'timeout';
      errorCode?: string;
      errorType?: string;
      message?: string;
    }> = [];

    // Match expectations against actual results
    for (const result of allResults) {
      const expectation = result.expectation;
      // Use discriminated union to check result state
      const hasError = !result.success;
      const hasTimeout = !result.success && result.timedOut === true;

      // Determine actual outcome
      let actualOutcome: 'success' | 'error' | 'timeout';
      let actualErrorCode: string | undefined;
      let actualErrorType: string | undefined;

      if (hasTimeout) {
        actualOutcome = 'timeout';
        actualErrorCode = ERROR_CODES.E403;
        actualErrorType = 'timeout';
      } else if (hasError && !result.success) {
        actualOutcome = 'error';
        actualErrorCode =
          result.error.errorType === ToolExecutionErrorType.INPUT_VALIDATION
            ? ERROR_CODES.E200
            : result.error.errorType ===
                ToolExecutionErrorType.OUTPUT_VALIDATION
              ? ERROR_CODES.E300
              : ERROR_CODES.E600;
        // Normalize enum value to expected string format (e.g., 'EXECUTION_ERROR' -> 'execution_error')
        actualErrorType = result.error.errorType.toLowerCase();
      } else {
        actualOutcome = 'success';
      }

      // Fix TypeScript: error is guaranteed to exist when actualOutcome is 'error'

      // Determine expected outcome
      // Some behavioral errors are tool-level (side_effect, output_explosion)
      // Others are test-level (unbounded_execution, execution_error)
      const toolLevelBehavioralErrors = ['side_effect', 'output_explosion'];
      const testLevelBehavioralErrors = [
        'unbounded_execution',
        'execution_error',
      ];
      const expectedErrorType = expectation?.error?.type;
      const isToolLevelBehavioralError =
        expectedErrorType &&
        toolLevelBehavioralErrors.includes(expectedErrorType);
      const isTestLevelBehavioralError =
        expectedErrorType &&
        testLevelBehavioralErrors.includes(expectedErrorType);

      let expectedOutcome: 'success' | 'error' | 'unknown';
      if (isToolLevelBehavioralError) {
        // For tool-level behavioral errors (side_effect, output_explosion),
        // the test execution itself should succeed - the error is detected separately at tool level
        expectedOutcome = 'success';
      } else if (isTestLevelBehavioralError) {
        // For test-level behavioral errors (unbounded_execution, execution_error),
        // the test execution itself should fail/timeout - that's how the error is detected
        expectedOutcome = 'error';
      } else if (expectation?.error) {
        expectedOutcome = 'error';
      } else if (expectation?.success === false) {
        expectedOutcome = 'error';
      } else {
        expectedOutcome = 'success'; // Default to success if no expectation or success=true
      }

      // Match expectation against actual result
      // For tool-level behavioral errors, test execution should succeed
      // For test-level behavioral errors, test execution should match the error type
      let expectationMatched: boolean;
      if (isToolLevelBehavioralError) {
        expectationMatched = actualOutcome === 'success';
      } else if (isTestLevelBehavioralError) {
        // For unbounded_execution, expect timeout; for execution_error, expect error
        if (expectedErrorType === 'unbounded_execution') {
          expectationMatched = actualOutcome === 'timeout';
        } else if (expectedErrorType === 'execution_error') {
          expectationMatched =
            actualOutcome === 'error' && actualErrorType === 'execution_error';
        } else {
          expectationMatched = false;
        }
      } else {
        expectationMatched = this.matchExpectation(
          expectation,
          actualOutcome,
          actualErrorCode,
          actualErrorType,
          !result.success ? result.error : undefined
        );
      }

      // Check if this is a synthetic input (no explicit expectation)
      const isSyntheticInput =
        result.testName?.startsWith('synthetic_input_') && !expectation;

      testResults.push({
        testName: result.testName,
        passed: expectationMatched,
        expected: expectedOutcome,
        actual: actualOutcome,
        errorCode: actualErrorCode,
        errorType: actualErrorType,
        message: !result.success ? result.error.message : undefined,
      });

      // Only add diagnostics if expectation doesn't match
      // For synthetic inputs without expectations, skip error reporting (they're exploratory)
      if (!expectationMatched && !isSyntheticInput) {
        if (expectedOutcome === 'error' && actualOutcome === 'success') {
          // Expected error but got success
          diagnostics.push(
            ...E600UnexpectedTestResult.checkWithBehavioralContext({
              toolName,
              testName: result.testName || 'unknown',
              testInput: result.testInput,
              expectedOutcome: 'error',
              actualOutcome: 'success',
              expectedErrorType: expectation?.error?.type,
              expectedErrorCode: expectation?.error?.code,
              expectedError: expectation?.error,
            })
          );
        } else if (expectedOutcome === 'success' && actualOutcome === 'error') {
          // Expected success but got error
          if (!result.success) {
            const errorMessage = result.error.message;
            const parsedError = this.parseValidationError(errorMessage);

            // Use appropriate rule based on error type
            if (
              result.error.errorType === ToolExecutionErrorType.INPUT_VALIDATION
            ) {
              diagnostics.push(
                ...E200InputValidationFailed.checkWithBehavioralContext({
                  toolName,
                  testName: result.testName,
                  testInput: result.testInput,
                  error: errorMessage,
                  parsedError: parsedError,
                  details: {
                    expectedOutputSchema: this.getExpectedOutputSchema(result),
                    actualError: {
                      code: actualErrorCode,
                      type: actualErrorType,
                      message: errorMessage,
                    },
                    errorType: result.error.errorType,
                    ...result.error.context,
                  },
                })
              );
            } else if (
              result.error.errorType ===
              ToolExecutionErrorType.OUTPUT_VALIDATION
            ) {
              diagnostics.push(
                ...E300OutputValidationFailed.checkWithBehavioralContext({
                  toolName,
                  testName: result.testName,
                  testInput: result.testInput,
                  expectedOutputSchema: this.getExpectedOutputSchema(result),
                  error: errorMessage,
                  details: {
                    actualError: {
                      code: actualErrorCode,
                      type: actualErrorType,
                      message: errorMessage,
                    },
                    ...result.error.context,
                  },
                })
              );
            } else {
              // For other errors, use E019 (execution errors are handled separately in the E019 rule section)
              // This case should rarely happen as E019 is handled separately
              const readableMessage = parsedError.summary || errorMessage;
              diagnostics.push({
                code: ERROR_CODES.E600,
                severity: 'error',
                message: parsedError.field
                  ? `${parsedError.field}: ${parsedError.message || readableMessage}`
                  : readableMessage,
                tool: toolName,
                context: {
                  testName: result.testName,
                  testInput: result.testInput,
                  expectedOutputSchema: this.getExpectedOutputSchema(result),
                  expectedResult: 'success',
                  actualError: {
                    code: actualErrorCode,
                    type: actualErrorType,
                    message: errorMessage,
                  },
                  errorType: result.error.errorType,
                  ...result.error.context,
                },
              });
            }
          }
        } else if (
          expectedOutcome === 'error' &&
          actualOutcome === 'error' &&
          !result.success
        ) {
          // Expected error but got different error
          const expectedCode = expectation?.error?.code;
          const expectedType = expectation?.error?.type;

          // Check if error type matches (if specified)
          let typeMatches = true;
          if (expectedType && actualErrorType) {
            const expectedTypeLower = String(expectedType).toLowerCase();
            const actualTypeLower = String(actualErrorType).toLowerCase();
            typeMatches =
              actualTypeLower.includes(expectedTypeLower) ||
              expectedTypeLower === actualTypeLower;
          }

          // Check if error code matches (if specified)
          const codeMatches = !expectedCode || actualErrorCode === expectedCode;

          // Check detailed error matching (if specified)
          const detailsMatch =
            !expectation?.error?.details ||
            this.matchExpectationDetails(
              expectation.error.details,
              result.error
            );

          // If any part doesn't match, report E020
          if (!typeMatches || !codeMatches || !detailsMatch) {
            diagnostics.push(
              ...E600UnexpectedTestResult.checkWithBehavioralContext({
                toolName,
                testName: result.testName || 'unknown',
                testInput: result.testInput,
                expectedOutcome: 'error',
                actualOutcome: 'error',
                expectedErrorType: expectedType,
                expectedErrorCode: expectedCode,
                actualErrorType: actualErrorType,
                actualErrorCode: actualErrorCode,
                expectedError: expectation?.error,
                actualError: {
                  code: actualErrorCode,
                  type: actualErrorType,
                  message: result.error.message,
                },
              })
            );
          }
        }
      }
    }

    // E012: Side Effect Detected
    if (sideEffectResult.detected) {
      diagnostics.push(
        ...E500SideEffectDetected.checkWithBehavioralContext({
          toolName,
          sideEffects: sideEffectResult.sideEffects,
        })
      );
    }

    // E301: Output Explosion
    for (const sizeResult of outputSizeResults) {
      if (sizeResult.exceedsLimit) {
        diagnostics.push(
          ...E301OutputExplosion.checkWithBehavioralContext({
            toolName,
            actualSize: sizeResult.actualSize,
            maxSize: sizeResult.maxSize,
            limitString: sizeResult.limitString,
          })
        );
      }
    }

    // E403: Unbounded Execution (timeouts and connection errors only)
    if (unboundedResult.detected) {
      diagnostics.push(
        ...E403UnboundedExecution.checkWithBehavioralContext({
          toolName,
          timedOut: unboundedResult.timedOut,
          declaredTimeout: contract.guarantees?.max_execution_time,
          actualTimeoutMs: toolTimeoutMs,
          errors: unboundedResult.errors.map(e => ({
            message: e.message,
            code: e.name,
          })),
        })
      );
    }

    // E400: Tool Execution Failed (execution errors, separate from E016)
    if (executionErrorResult.detected) {
      diagnostics.push(
        ...E400ToolExecutionFailed.checkWithBehavioralContext({
          toolName,
          errors: executionErrorResult.errors.map(e => ({
            message: e.message,
            code: e.name,
          })),
        })
      );
    }

    // Validate output structure (if schema available and test expects success)
    if (toolSchema.outputSchema) {
      for (const result of allResults) {
        if (!result) continue;

        // Only validate output if test expects success
        const expectation = result.expectation;
        const expectsSuccess =
          !expectation?.error && expectation?.success !== false;

        if (result.success && expectsSuccess) {
          // Use test-specific output schema or fall back to contract schema
          const expectedOutputSchema = this.getExpectedOutputSchema(result);
          const outputSchema = expectation?.output_schema
            ? this.resolveSchemaByName(
                expectation.output_schema,
                toolSchema.outputSchema
              )
            : expectedOutputSchema
              ? this.resolveSchemaByName(
                  expectedOutputSchema,
                  toolSchema.outputSchema
                )
              : toolSchema.outputSchema;

          const validationResult = validateOutputStructure(
            result.output,
            outputSchema || toolSchema.outputSchema
          );

          if (!validationResult.valid) {
            // Check if this test result already failed expectation matching
            const testResult = testResults.find(
              tr => tr.testName === result.testName
            );
            if (!testResult || !testResult.passed) {
              // Output validation failed - this is unexpected for success expectation
              diagnostics.push(
                ...E300OutputValidationFailed.checkWithBehavioralContext({
                  toolName,
                  testName: result.testName,
                  testInput: result.testInput,
                  expectedOutputSchema: this.getExpectedOutputSchema(result),
                  error: validationResult.error || 'Unknown error',
                  details: validationResult.details,
                })
              );
            }
          }
        }
      }
    }

    // Compute summary based on test expectations
    const totalExecutions = allResults.length;
    const totalContractTests = testResults.length;
    const passedTests = testResults.filter(tr => tr.passed).length;
    const failedTests = testResults.filter(tr => !tr.passed).length;
    const successfulExecutions = allResults.filter(r => r.success).length;
    const failedExecutions = allResults.filter(r => !r.success).length;
    const timedOutExecutions = allResults.filter(
      r => !r.success && r.timedOut === true
    ).length;

    // Determine if test passed based on expectations (no unmatched diagnostics)
    // Filter out expected behavioral errors - check if any test expects them
    // Use error type to code mapping from constants
    const errorTypeToCode = ERROR_TYPE_TO_CODE;

    // Collect expected behavioral errors from all test expectations
    const expectedBehavioralErrors = new Set<string>();
    if (contract.tests) {
      for (const test of contract.tests) {
        if (test.expect?.error?.type) {
          const errorType = test.expect.error.type;
          const errorCode = errorTypeToCode[errorType];
          if (errorCode) {
            expectedBehavioralErrors.add(errorCode);
          }
        }
      }
    }

    // Filter out expected behavioral errors from diagnostics
    // This prevents them from being displayed and counted in the summary
    const filteredDiagnostics = diagnostics.filter(
      d => !expectedBehavioralErrors.has(d.code || '')
    );

    const errors = filteredDiagnostics.filter(d => d.severity === 'error');
    const passed = errors.length === 0;

    return {
      toolName,
      contract,
      diagnostics: filteredDiagnostics, // Use filtered diagnostics to exclude expected errors
      passed,
      summary: {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        timedOutExecutions,
        testsPassed: totalContractTests > 0 ? passedTests : undefined,
        testsFailed: totalContractTests > 0 ? failedTests : undefined,
      },
    };
  }

  /**
   * Parse Pydantic validation error message to extract key information.
   */
  private parseValidationError(errorMessage: string): {
    field?: string;
    message?: string;
    errorType?: string;
    inputValue?: string;
    inputType?: string;
    summary?: string;
  } {
    const parsed: {
      field?: string;
      message?: string;
      errorType?: string;
      inputValue?: string;
      inputType?: string;
      summary?: string;
    } = {};

    // Extract field name (usually on its own line)
    const fieldMatch = errorMessage.match(/^(\w+)\s*$/m);
    if (fieldMatch && fieldMatch[1]) {
      parsed.field = fieldMatch[1];
    }

    // Extract error type and message
    const typeMatch = errorMessage.match(/\[type=([^,]+)/);
    if (typeMatch && typeMatch[1]) {
      parsed.errorType = typeMatch[1];
    }

    // Extract input value and type
    const inputValueMatch = errorMessage.match(/input_value=([^,]+)/);
    if (inputValueMatch && inputValueMatch[1]) {
      parsed.inputValue = inputValueMatch[1].trim();
    }

    const inputTypeMatch = errorMessage.match(/input_type=(\w+)/);
    if (inputTypeMatch && inputTypeMatch[1]) {
      parsed.inputType = inputTypeMatch[1];
    }

    // Build summary based on error type
    if (parsed.errorType === 'missing_argument') {
      parsed.summary = `Missing required field: ${parsed.field || 'unknown'}`;
      parsed.message = `Field "${parsed.field || 'unknown'}" is required but was not provided`;
    } else if (parsed.errorType === 'string_type') {
      parsed.summary = `Invalid type for ${parsed.field || 'field'}: expected string, got ${parsed.inputType || 'unknown'}`;
      parsed.message = `Expected string but received ${parsed.inputType || 'unknown type'}`;
    } else if (parsed.errorType === 'unexpected_keyword_argument') {
      parsed.summary = `Unexpected field: ${parsed.field || 'unknown'}`;
      parsed.message = `Field "${parsed.field || 'unknown'}" is not allowed in the input schema`;
    } else {
      // Generic error
      const firstLine = errorMessage.split('\n')[0];
      parsed.summary = firstLine || errorMessage;
      parsed.message = errorMessage;
    }

    return parsed;
  }

  /**
   * Match actual result against test expectation.
   */
  private matchExpectation(
    expectation: import('./contract-types').TestExpectation | undefined,
    actualOutcome: 'success' | 'error' | 'timeout',
    actualErrorCode: string | undefined,
    actualErrorType: string | undefined,
    error: import('@/runtime/sandbox').ToolExecutionError | undefined
  ): boolean {
    // No expectation means expect success by default
    if (!expectation) {
      return actualOutcome === 'success';
    }

    // If error expectation is specified
    if (expectation.error) {
      // Must have an error
      if (actualOutcome !== 'error') {
        return false;
      }

      // Match by type first (most important for developer-friendly matching)
      if (expectation.error.type && actualErrorType) {
        const expectedType = String(expectation.error.type).toLowerCase();
        const actualType = String(actualErrorType).toLowerCase();
        // Normalize type names for matching
        const typeMapping: Record<string, string[]> = {
          input_validation: ['input_validation'],
          output_validation: ['output_validation'],
          execution_error: ['execution_error', 'unknown'],
          side_effect: ['side_effect'],
          output_explosion: ['output_explosion'],
          unbounded_execution: ['unbounded_execution', 'timeout'],
        };

        const expectedTypes = typeMapping[expectedType] || [expectedType];
        const typeMatches = expectedTypes.some(
          et => actualType.includes(et) || et === actualType
        );

        if (!typeMatches) {
          return false;
        }
      }

      // Match error code if specified (optional - for backward compatibility)
      if (expectation.error.code && actualErrorCode) {
        const expectedCode = String(expectation.error.code)
          .trim()
          .toUpperCase();
        const actualCode = String(actualErrorCode).trim().toUpperCase();
        if (expectedCode !== actualCode) {
          return false;
        }
      }

      // Match error details if specified (most specific matching)
      if (expectation.error.details && error) {
        const detailsMatch = this.matchExpectationDetails(
          expectation.error.details,
          error
        );
        if (!detailsMatch) {
          return false;
        }
      }

      // If we have type or details, that's sufficient for matching
      // If only code was specified, we already checked it above
      return true;
    }

    // If success is explicitly false, expect error
    if (expectation.success === false) {
      return actualOutcome === 'error';
    }

    // Default: expect success
    return actualOutcome === 'success';
  }

  /**
   * Match expectation details against actual error.
   */
  private matchExpectationDetails(
    expectedDetails:
      | import('./contract-types').ErrorExpectationDetails
      | undefined,
    error: import('@/runtime/sandbox').ToolExecutionError
  ): boolean {
    if (!expectedDetails) {
      return true; // No details to match
    }

    const parsedError = this.parseValidationError(error.message);

    // Match error_type if specified
    if (
      expectedDetails.error_type &&
      expectedDetails.error_type !== parsedError.errorType
    ) {
      return false;
    }

    // Match field if specified
    if (expectedDetails.field && expectedDetails.field !== parsedError.field) {
      return false;
    }

    // Match expected type if specified (pattern match)
    if (expectedDetails.expected) {
      const expectedStr = String(expectedDetails.expected).toLowerCase();
      if (!error.message.toLowerCase().includes(expectedStr)) {
        return false;
      }
    }

    // Match received type if specified
    if (
      expectedDetails.received &&
      expectedDetails.received !== parsedError.inputType
    ) {
      return false;
    }

    return true;
  }

  /**
   * Resolve schema by name from JSON Schema $defs.
   *
   * Schema names in contracts are string references to named schemas defined in the
   * tool's schema $defs section (e.g., "Username", "UserResponse").
   *
   * This function looks up the named schema from the root schema's $defs dictionary.
   * If the schema name is not found in $defs, it falls back to the defaultSchema.
   *
   * @param schemaName - Schema name to resolve (e.g., "Username")
   * @param defaultSchema - The root schema containing $defs (e.g., tool outputSchema)
   * @returns The resolved schema from $defs, or defaultSchema if not found
   */
  private resolveSchemaByName(
    schemaName: string,
    defaultSchema: unknown
  ): unknown {
    // Check if defaultSchema is an object with $defs
    if (
      defaultSchema &&
      typeof defaultSchema === 'object' &&
      !Array.isArray(defaultSchema)
    ) {
      const schema = defaultSchema as Record<string, unknown>;

      // Look for $defs (JSON Schema 2020-12) or definitions (JSON Schema draft-07)
      const defs =
        ('$defs' in schema ? schema.$defs : undefined) ||
        ('definitions' in schema ? schema.definitions : undefined);

      if (defs && typeof defs === 'object' && !Array.isArray(defs)) {
        const defsDict = defs as Record<string, unknown>;

        // Look up the schema by name in $defs
        if (schemaName in defsDict) {
          const resolvedSchema = defsDict[schemaName];
          // Return the resolved schema, merging with any base schema context if needed
          return resolvedSchema;
        }
      }
    }

    // Fallback to defaultSchema if schema name not found in $defs
    // This handles cases where schemaName refers to the root schema itself
    // or when $defs doesn't exist
    return defaultSchema;
  }
}
