#!/usr/bin/env bun
import { ensureE2eNodeModuleFixtures } from "./fixtures";

await ensureE2eNodeModuleFixtures();
console.log("E2E node_modules fixtures are materialized.");
