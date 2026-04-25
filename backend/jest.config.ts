import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,

  // ── Speed fixes ────────────────────────────────────────────────────────────
  // Limit workers — prevents CPU thrashing on dev machines
  maxWorkers: "50%",

  // Cache compiled TypeScript between runs
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: { isolatedModules: true }, // skip full type-check during tests (tsc handles that)
    }],
  },

  // Kill Jest after tests finish — prevents hanging on open DB/socket handles
  forceExit: true,

  // Fail fast on open handles instead of waiting 5s
  detectOpenHandles: false,

  // Per-test timeout — don't let a single test block the suite
  testTimeout: 10_000,

  // Only collect coverage when explicitly requested (--coverage flag)
  collectCoverage: false,
};

export default config;
