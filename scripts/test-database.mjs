import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Always creates its own database: never reads .env or accepts a remote URL.
const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync("/tmp/camp-db-tests-");
const data = join(temporary, "data");
const run = (binary, args) =>
  execFileSync(binary, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 60000,
    stdio: "pipe",
  });
let started = false;
try {
  run("initdb", ["-D", data, "-A", "trust", "--no-locale", "-E", "UTF8"]);
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    join(temporary, "postgres.log"),
    "-o",
    `-k ${temporary} -p 55439 -h ''`,
    "-w",
    "start",
  ]);
  started = true;
  const migrations = readdirSync(join(root, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => join("supabase/migrations", name));
  const files = [
    "supabase/tests/bootstrap.sql",
    ...migrations,
    "supabase/seed.sql",
    "supabase/seed.sql",
    "supabase/tests/migrations.sql",
    "supabase/tests/karaoke.sql",
    "supabase/tests/worship-backfill.sql",
    "supabase/tests/seed-repeat.sql",
  ];
  for (const file of files) {
    run("psql", [
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
      "-h",
      temporary,
      "-p",
      "55439",
      "-d",
      "postgres",
      "-q",
      "-1",
      "-f",
      file,
    ]);
    console.log(`Passed: ${file}`);
  }
  console.log("Database migrations, repeated seeds, IDs, and CRUD access rules passed.");
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (started) run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
  rmSync(temporary, { recursive: true, force: true });
}
