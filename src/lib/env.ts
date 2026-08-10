try {
  process.loadEnvFile();
} catch {
  // Environment is already provided in Docker or CI.
}

export {};
