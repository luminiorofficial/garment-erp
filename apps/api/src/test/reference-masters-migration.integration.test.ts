import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
});
let available = false;
try {
  await client.connect();
  available = true;
} catch {
  /* Same optional DB convention as other suites. */
}

const migrations = [
  "0000_wonderful_ironclad",
  "0001_customers",
  "0002_suppliers",
  "0003_job_workers",
  "0004_reference_masters",
];
describe.skipIf(!available)("reference master data migration", () => {
  it("preserves populated legacy values, enforces constraints, and rolls back safely", async () => {
    const schema = `migration_test_${randomUUID().replaceAll("-", "")}`;
    await client.query("BEGIN");
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET LOCAL search_path TO "${schema}"`);
      for (const name of migrations.slice(0, 4)) {
        const sql = readFileSync(
          new URL(`../db/migrations/${name}.sql`, import.meta.url),
          "utf8",
        );
        await client.query(sql.replaceAll('"public".', `"${schema}".`));
      }
      await client.query(`INSERT INTO job_workers (id, code, name, process, capacity_per_day, capacity_unit)
        VALUES (gen_random_uuid(), 'A', 'A', 'STITCHING', 100, 'PCS'),
               (gen_random_uuid(), 'B', 'B', 'EMBROIDERY', 20, 'KG'),
               (gen_random_uuid(), 'C', 'C', 'CUSTOM PROCESS', 10, 'CUSTOM'),
               (gen_random_uuid(), 'D', 'D', ' stitching ', NULL, NULL),
               (gen_random_uuid(), 'E', 'E', NULL, NULL, NULL)`);
      const sql = readFileSync(
        new URL("../db/migrations/0004_reference_masters.sql", import.meta.url),
        "utf8",
      ).replaceAll('"public".', `"${schema}".`);
      // A bad legacy record must abort without losing the original columns/data.
      await client.query("SAVEPOINT bad_legacy");
      await client.query(
        "UPDATE job_workers SET process = '' WHERE code = 'E'",
      );
      await expect(client.query(sql)).rejects.toThrow("Blank legacy");
      await client.query("ROLLBACK TO SAVEPOINT bad_legacy");
      expect(
        (await client.query("SELECT process FROM job_workers WHERE code = 'A'"))
          .rows[0].process,
      ).toBe("STITCHING");
      await client.query(sql);
      const rows = (
        await client.query(`SELECT j.code, p.code AS process, u.code AS unit, j.capacity_per_day AS capacity
        FROM job_workers j LEFT JOIN processes p ON p.id = j.process_id
        LEFT JOIN units u ON u.id = j.capacity_unit_id ORDER BY j.code`)
      ).rows;
      expect(rows).toEqual([
        { code: "A", process: "STITCHING", unit: "PCS", capacity: 100 },
        { code: "B", process: "EMBROIDERY", unit: "KG", capacity: 20 },
        { code: "C", process: "CUSTOM PROCESS", unit: "CUSTOM", capacity: 10 },
        { code: "D", process: "STITCHING", unit: null, capacity: null },
        { code: "E", process: null, unit: null, capacity: null },
      ]);
      const invalid = [
        ["UPDATE units SET decimal_places = -1", "23514"],
        ["UPDATE units SET decimal_places = 7", "23514"],
        [
          "UPDATE job_workers SET capacity_unit_id = NULL WHERE code = 'A'",
          "23514",
        ],
        [
          "UPDATE job_workers SET process_id = gen_random_uuid() WHERE code = 'A'",
          "23503",
        ],
        [
          "UPDATE job_workers SET capacity_unit_id = gen_random_uuid() WHERE code = 'A'",
          "23503",
        ],
        ["UPDATE processes SET created_by = gen_random_uuid()", "23503"],
        ["UPDATE units SET updated_by = gen_random_uuid()", "23503"],
        ["DELETE FROM processes WHERE code = 'STITCHING'", "23503"],
        [
          "INSERT INTO units (id, code, name) VALUES (gen_random_uuid(), 'PCS', 'Duplicate')",
          "23505",
        ],
      ];
      for (const [statement, code] of invalid) {
        await client.query("SAVEPOINT constraint_test");
        await expect(client.query(statement!)).rejects.toMatchObject({ code });
        await client.query("ROLLBACK TO SAVEPOINT constraint_test");
      }
      expect(
        (
          await client.query(
            `SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = 'job_workers' AND column_name IN ('process', 'capacity_unit')`,
            [schema],
          )
        ).rows,
      ).toEqual([]);
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  });
});
