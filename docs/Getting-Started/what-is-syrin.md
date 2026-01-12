---
title: "What Is Syrin?"
description: "Syrin is a runtime intelligence system that governs MCP execution"
---

## Hi, I'm Syrin 👋

![Syrin Logo Dark Bg](/logo/syrin-logo-dark-bg.png)

> **Syrin is a runtime intelligence system for MCP execution.**

It runs alongside an MCP server and governs how execution happens at runtime.

Syrin does not define protocols.\
Syrin does not generate prompts.\
Syrin does not replace models or tools.

Its responsibility is singular:

> **Make MCP execution observable, enforceable, and reproducible.**

## Runtime Authority

Syrin introduces a strict separation of responsibilities:

| Component     | Responsibility                    |
| ------------- | --------------------------------- |
| LLM           | Propose actions                   |
| Syrin Runtime | Validate, order, execute, enforce |
| Tools         | Perform bounded work              |
| Adapters      | Emit execution facts              |
| UI / CLI      | Visualize only                    |

In this model:

- The LLM is **advisory**
- The runtime is **authoritative**

> **LLM proposes. Runtime decides.**

## Execution Model

Syrin treats every MCP run as an explicit state machine.

A run moves through defined states, for example:

INIT → SESSION_STARTED → CONTEXT_BUILT → LLM_PROPOSED → VALIDATED → TOOL_EXECUTED (0..n) → SESSION_COMPLETED | SESSION_HALTED

There are no implicit transitions.

If a state change is not recorded, it did not happen.

## Events, Not Logs

Syrin records execution as **ordered, immutable events**.

Events are the unit of truth.

Logs are implementation details.

If something happened and there is no event, Syrin does not consider it real.

This makes execution auditable and replayable by construction.

## Determinism First

Determinism in Syrin applies to execution, not text output.

Identical inputs must produce identical event sequences.

Testing, debugging, and regression detection operate on events, not prompts or logs.

If execution cannot be replayed, Syrin treats it as a failure mode.

## What Syrin Is Not

Syrin is intentionally constrained.

It does **not**:

- Infer intent
- Guess why something failed
- Explain behaviour, it cannot be replayed
- Continue after invariant violations

Strictness is deliberate.

## What Changes When Syrin Is Present

When Syrin governs MCP execution:

- Execution order is explicit
- Failures are bounded and terminal
- Tool behaviour is accountable
- Executions are replayable
- Regressions are detectable

These are not features layered on top.

They are properties enforced by the runtime.

## How Syrin Should Be Understood

Syrin is:

- Execution governance for MCP
- Runtime intelligence, not model intelligence
- Event-sourced execution, not log-based debugging

It exists because MCP systems require **controlled execution**, not best-effort behaviour.

## Next

**Installation**\
Attach Syrin to an MCP project to capture execution from the first meaningful run.