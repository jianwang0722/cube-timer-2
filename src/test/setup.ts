import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Auto-cleanup relies on a global afterEach, which is disabled (globals: false).
afterEach(cleanup);
