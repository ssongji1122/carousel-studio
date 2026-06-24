// One-shot migration: flat global data -> project-scoped data (v1, Option B).
//
//   node scripts/migrate-to-projects.mjs          # dry-run (default)
//   node scripts/migrate-to-projects.mjs --apply  # write changes
//
// What it does:
//   - creates data/workspace.json (studio-soluta active + sample-* projects)
//   - moves data/brand.json (currently ORDINAL) -> data/brands.json["sample-ordinal"]
//     (studio-soluta + other samples fall back to seed/blank at runtime)
//   - stamps projectId onto every carousel / plan / style-preset by name rule
//   - backs up each touched file to *.pre-migrate.bak before writing

import { readFile, writeFile, copyFile, rm, access } from "fs/promises";
import path from "path";

const DATA = path.resolve(process.cwd(), "data");
const APPLY = process.argv.includes("--apply");
const now = new Date().toISOString();

const SAMPLE_RULES = [
  ["sample-ordinal", /ordinal/i],
  ["sample-rose-shaker", /로즈쉐이커|rose.?shaker/i],
  ["sample-price", /프라이스|price/i],
  ["sample-momspepper", /맘스페퍼|momspepper|moms.?pepper/i],
  ["sample-pogon", /포곤|pogon/i],
];

const PROJECT_NAMES = {
  "studio-soluta": "studio.soluta",
  "sample-ordinal": "ORDINAL EDITION",
  "sample-rose-shaker": "로즈쉐이커",
  "sample-price": "프라이스",
  "sample-momspepper": "맘스페퍼",
  "sample-pogon": "포곤",
};

function classify(name) {
  for (const [pid, re] of SAMPLE_RULES) if (re.test(name || "")) return pid;
  return "studio-soluta";
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file) {
  return JSON.parse(await readFile(path.join(DATA, file), "utf8"));
}

async function backupAndWrite(file, obj) {
  const full = path.join(DATA, file);
  if (await exists(full)) await copyFile(full, full + ".pre-migrate.bak");
  await writeFile(full, JSON.stringify(obj, null, 2), "utf8");
}

async function main() {
  const log = (...a) => console.log(...a);
  log(APPLY ? "=== MIGRATION (APPLY) ===" : "=== MIGRATION (DRY-RUN) ===\n");

  // --- carousels ---
  const carousels = await readJson("carousels.json");
  const byProj = {};
  for (const c of carousels.carousels) {
    const pid = classify(c.name);
    c.projectId = pid;
    (byProj[pid] ||= []).push(c.name);
  }
  log("carousels:", carousels.carousels.length);
  for (const pid of Object.keys(byProj).sort()) {
    log(`  ${pid} (${byProj[pid].length})`);
    for (const n of byProj[pid]) log(`     - ${n}`);
  }

  // --- plans (all -> studio-soluta; samples have no plans) ---
  let plans = { plans: [] };
  if (await exists(path.join(DATA, "plans.json"))) {
    plans = await readJson("plans.json");
    for (const p of plans.plans) p.projectId = "studio-soluta";
    log(`\nplans: ${plans.plans.length} -> studio-soluta`);
  }

  // --- style-presets (optional) ---
  let presets = null;
  if (await exists(path.join(DATA, "style-presets.json"))) {
    presets = await readJson("style-presets.json");
    for (const p of presets.presets) {
      p.projectId ||= "studio-soluta";
      p.scope ||= "project";
    }
    log(`style-presets: ${presets.presets.length} -> studio-soluta`);
  } else {
    log("\nstyle-presets.json: absent (skip)");
  }

  // --- brands map: capture current brand.json as sample-ordinal ---
  let brands = {};
  if (await exists(path.join(DATA, "brand.json"))) {
    const current = await readJson("brand.json");
    brands["sample-ordinal"] = current;
    log(`\nbrands.json["sample-ordinal"] <- brand.json (${current.name})`);
    log("studio-soluta + other samples: runtime seed/blank fallback");
  } else {
    log("\nbrand.json: absent — brands.json will be empty");
  }

  // --- workspace ---
  const projectIds = ["studio-soluta", ...SAMPLE_RULES.map(([id]) => id)];
  const workspace = {
    activeProjectId: "studio-soluta",
    projects: projectIds.map((id) => ({
      id,
      name: PROJECT_NAMES[id] || id,
      defaultBrandId: "main",
      createdAt: now,
      updatedAt: now,
    })),
  };
  log(`\nworkspace: active=studio-soluta, projects=${projectIds.length}`);

  if (!APPLY) {
    log("\n(dry-run) no files written. Re-run with --apply to commit.");
    return;
  }

  await backupAndWrite("carousels.json", carousels);
  if (plans.plans.length) await backupAndWrite("plans.json", plans);
  if (presets) await backupAndWrite("style-presets.json", presets);
  await backupAndWrite("brands.json", brands);
  await backupAndWrite("workspace.json", workspace);

  // brand.json is no longer read; keep its backup, remove the live file.
  const brandFile = path.join(DATA, "brand.json");
  if (await exists(brandFile)) {
    await copyFile(brandFile, brandFile + ".pre-migrate.bak");
    await rm(brandFile);
    log("brand.json -> brand.json.pre-migrate.bak (removed live file)");
  }

  log("\n=== DONE ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
