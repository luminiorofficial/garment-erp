import { defineConfig } from "vitest/config";

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
