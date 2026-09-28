import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { defineConfig } from "vitest/config";

// Match the dev/start/db:seed scripts (--env-file-if-exists=.env) so the
// integration suites use the same local DATABASE_URL. Variables already set
// in the environment take precedence over the file.
if (existsSync(".env")) loadEnvFile(".env");

export default defineConfig({
  test: {
    environment: "node",
    // The integration suite pings this and skips itself if unreachable —
    // this default just lets the db client module load without a real
    // DATABASE_URL in environments (like CI without Postgres) that don't
    // export one. Set a real DATABASE_URL to actually run that suite.
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgres://garment_erp:garment_erp@localhost:5432/garment_erp",
    },
  },
});
