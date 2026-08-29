# BRAHMA Live Demo Testing Guide

Follow these exact steps to validate the live TrueForge integration. You do not need to understand the backend code to run this test.

## Prerequisites
1. Ensure your `.env` file contains valid keys for `OPENAI_API_KEY` and `DAYTONA_API_KEY`.
2. Ensure `BRAHMA_MODE=live` is set in your `.env` file (this enables TrueForge mode).
3. Ensure the TrueForge daemon is running in a separate terminal:
   `node --import ./register-loader.mjs node_modules/@truefoundry/trueforge/dist/cli.js --port 8790`

## Validation Steps

1. **Verify Environment Health**
   Open a new terminal in the project root and run:
   ```bash
   npm run doctor
   ```
   *Expected: All checks PASS and print `READY FOR LIVE DEMO`.*

2. **Run TrueForge Smoke Test**
   Run the standalone agent test to ensure TrueForge can execute LLM turns and MCP tools:
   ```bash
   npm run trueforge:smoke
   ```
   *Expected: Prints `TRUEFORGE LIVE: PASS` and outputs a real Session ID.*

3. **Reset Demo State**
   Ensure the mock checkout service is in a healthy state before starting:
   ```bash
   npm run demo:reset
   ```

4. **Launch the Full BRAHMA Stack**
   Start the orchestrator, incident server, API, and terminal UI:
   ```bash
   npm run dev
   ```
   *Expected: The terminal UI appears and says `TRUEFORGE LIVE ●`.*

5. **Trigger the Incident**
   In a separate terminal, trigger the checkout service performance degradation:
   ```bash
   npm run demo:incident
   ```

6. **Observe the Agent**
   Watch the terminal UI:
   * The `checkout-api` latency will spike to `1,140 ms`.
   * Workers will spawn and the `LIVE EVENT STREAM` will populate with reasoning steps streamed directly from TrueForge.

7. **Inject Chaos (Optional)**
   While the worker is investigating, press the `f` key in the terminal running `npm run dev`.
   * Watch the `CHAOS TEST INJECTED` alert appear.
   * Confirm the current worker fails and is successfully replaced by a new worker.

8. **Approve the Deployment**
   Wait for the agent to finish its investigation and sandbox verification. The terminal will display:
   `HUMAN AUTHORITY REQUIRED`
   Press `a` in the terminal to **APPROVE**.

9. **Verify Resolution**
   * The mission state will change to `COMPLETED`.
   * The `checkout-api` latency will return to ~`93 ms`.
