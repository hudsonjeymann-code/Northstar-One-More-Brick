import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const html = read("index.html");
const markup = html.slice(0, html.indexOf("<script type=\"application/json\""));
const serviceWorker = read("service-worker.js");
const manifest = JSON.parse(read("manifest.webmanifest"));
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const count = (pattern, text = html) => [...text.matchAll(pattern)].length;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules"].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const required = [
  ".gitignore", ".nojekyll", "README.md", "app-cover.png", "icon-192.png", "icon-512.png", "icon.svg",
  "index.html", "manifest.webmanifest", "package.json", "service-worker.js", "scripts/verify-repository.mjs",
  ".github/workflows/verify.yml",
];
required.forEach((f) => check(`Required file: ${f}`, fs.existsSync(path.join(root, f))));

const expectedPages = ["home", "today", "reset", "health", "photos", "mountains", "journey", "goals", "reviews", "data"];
const pageIds = [...markup.matchAll(/<section class="page(?: active)?" id="([^"]+)"/g)].map(m => m[1]);
check("Ten primary sections remain", JSON.stringify(pageIds) === JSON.stringify(expectedPages));
expectedPages.forEach((id) => check(`Page exists: ${id}`, pageIds.includes(id)));

check("V66 Winter Rebuild is active", /const VERSION = 66;/.test(html) && /project-northstar-winter-private-backup-v66/.test(html));
check("Public build marker is active", /const PUBLIC_BUILD = true/.test(html));
check("November 18 restart and February 28 boundary remain", /const CAMPAIGN_START = "2026-11-18";/.test(html) && /const CAMPAIGN_END = "2027-02-28";/.test(html));
check("52-brick wall logic remains", /Array\.from\(\{ length: 52 \}/.test(html) && /function wallQualifies/.test(html));
check("Six permanent daily standards remain", count(/data-check="[^"]+"/g, markup) === 6);
check("Five body-status sliders remain", count(/data-pain="[^"]+"/g, markup) === 5);
check("Today command remains", /id="todayCommandCard"/.test(markup) && /id="criticalMission"/.test(markup) && /id="bodyMission"/.test(markup) && /id="lifeMission"/.test(markup));
check("Northstar Web remains", /function lifeWebSnapshot/.test(html) && /id="lifeWebCalibration"/.test(markup));
check("Iron Ledger remains", /const IRON_LEDGER_BLUEPRINT/.test(html) && count(/id: "(?:INC30|OHP185|CHIN130|P500|CURL135|SQ200)"/g, html) === 6);
check("Recovery command remains", /id="recoveryCommandCard"/.test(markup));
check("Three current photo slots remain", count(/data-photo-slot="[^"]+"/g, markup) === 3);
check("Return to Mountains remains", /First 14er/.test(html) && /Desolation Wilderness/.test(html));
check("Journey UI remains", /id="journeyGrid"/.test(markup) && /function renderJourney/.test(html));
check("Journey public seed is empty", /const JOY_MILESTONE_SEED = Object\.freeze\(\[\]\);/.test(html));
check("Goals remain", /id="goalList"/.test(markup) || /class="goal-list"/.test(markup));
check("Reviews remain", /id="reviews"/.test(markup));
check("Bulking reviews remain", /November 30/.test(html) && /January 31/.test(html) && /February 28/.test(html) && /Bulking Reviews/.test(html));
check("Reward checkpoints and bonuses remain", /const WALL_CHECKPOINTS/.test(html) && count(/\{\"target\": (?:7|10|14|18|21|25|28|32|35|39|42|46|49|52), \"name\":/g, html) === 14);
check("Restart / 15-day proof feature remains", /15/.test(html) && /restart/i.test(html) && /restartClock/.test(html));
check("Historical 26-day proof remains canonical", /historicalWallBest: 26/.test(html));
check("No-Slither 90 completion remains canonical", /noSlither90Complete: true/.test(html) && /historicalBestAttentionStreak: 90/.test(html));
check("Mobile dock exists", /class="mobile-dock"/.test(markup));
check("Mobile responsive rules exist", /@media\(max-width:899px\)/.test(html) && /@media\(max-width:560px\)/.test(html));
check("Review layout has mobile one-column support", /#reviews[\s\S]*grid-template-columns:1fr/.test(html) || /review.*grid-template-columns:1fr/i.test(html));
check("Touch targets are 44px minimum", /min-height:44px/.test(html));
check("Rugged color system remains", /V64/i.test(html) && /--gold/.test(html) && /--green/.test(html) && /--red/.test(html));
check("Light text base remains", /--text:\s*#f/i.test(html) || /--text:\s*#e/i.test(html));
check("No duplicate DOM IDs", (() => { const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]); return ids.length===new Set(ids).size; })());
check("V60 restore compatibility remains", /project-northstar-final92-private-backup-v60/.test(html));
check("V61 restore compatibility remains", /project-northstar-final92-private-backup-v61/.test(html));
check("V62 restore compatibility remains", /project-northstar-final92-private-backup-v62/.test(html));
check("V63 restore compatibility remains", /project-northstar-final92-private-backup-v63/.test(html));
check("V59 restore compatibility remains", /project-52-private-backup-v59/.test(html));
check("Repository-relative manifest", manifest.id === "./" && manifest.scope === "./" && manifest.start_url === "./index.html#home");
check("Manifest icons remain", Array.isArray(manifest.icons) && manifest.icons.length === 2);
const pngSize = (name) => { const b=fs.readFileSync(path.join(root,name)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
check("Armored angel app cover exists", fs.existsSync(path.join(root, "app-cover.png")));
check("App cover is 1024 square", JSON.stringify(pngSize("app-cover.png")) === JSON.stringify([1024,1024]));
check("192 icon dimensions correct", JSON.stringify(pngSize("icon-192.png")) === JSON.stringify([192,192]));
check("512 icon dimensions correct", JSON.stringify(pngSize("icon-512.png")) === JSON.stringify([512,512]));
check("HTML uses PNG app icon", /rel="icon" href="\.\/icon-192\.png"/.test(html));
check("Social cover points to app cover", /property="og:image" content="\.\/app-cover\.png"/.test(html));
check("Service-worker cache bumped to V66", /v66-strength-nov18-2026/.test(serviceWorker));
check("Service worker caches app cover", /\.\/app-cover\.png/.test(serviceWorker));
check("Service-worker cache scoped to repo", /CACHE_SCOPE_ID/.test(serviceWorker) && /CACHE_PREFIX/.test(serviceWorker));
check("Controlled SW update remains", /SKIP_WAITING/.test(serviceWorker));

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter(m => !/type="application\/json"/.test(m[0]))
  .map(m => m[1]);
try { inlineScripts.forEach(script => new vm.Script(script)); check("Application JavaScript parses", inlineScripts.length >= 1); }
catch (e) { console.error(e); check("Application JavaScript parses", false); }
try { new vm.Script(serviceWorker); check("Service worker JavaScript parses", true); }
catch { check("Service worker JavaScript parses", false); }

const files = walk(root);
const rel = files.map(f => path.relative(root, f));
check("No private backup file committed", rel.every(f => !/(?:private|restore|backup.*\.json)/i.test(f)));
check("No personal JPEG/HEIC files committed", rel.every(f => !/\.(?:jpe?g|heic|heif|mov)$/i.test(f)));
const textFiles = files.filter(f => /\.(?:html|js|mjs|json|md|txt|yml|yaml|svg)$/i.test(f) || [".gitignore",".nojekyll"].includes(path.basename(f)));
const publicText = textFiles.map(f => fs.readFileSync(f, "utf8")).join("\n");
check("No embedded personal image payload", !/data:image\/(?:jpeg|png|webp|heic|heif);base64,/i.test(publicText));
check("No embedded private state bootstrap", !/localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(\{\"version\":65/.test(publicText));
check("Public storage seed is empty", /const PRIVATE_INITIAL_STATE = null;/.test(html));
check("State database is path-scoped", /STATE_DB = `sixMonthForge\.project52\.state\.\$\{APP_SCOPE_ID\}`/.test(html));
check("Large restores await a durable prior snapshot", /await savePreImportSnapshot\(currentState, currentPhotos\)/.test(html));
check("Restore snapshots preserve the prior photo vault", /async function savePreImportSnapshot\(snapshot, photos = null\)/.test(html));
check("Persisted database is hydrated before startup", /async function init\(\) \{\s*await hydratePersistedState\(\)/.test(html));
check("Save failures have a visible status", /Not saved · export backup/.test(html));
check("Controlled update waits for current input save", /captureDailyText\(\);\s*if \(!\(await saveState\(\)\)\) return;/.test(html));
const financialMarkers = ["128"+"271.49", "98"+"271.49", "253"+"74.5", "American"+" Funds", "Robin"+"hood", "SoFi Emergency"+" Fund", "Toyota"+" Crown"];
check("No private finance snapshot committed", financialMarkers.every(x => !publicText.toLowerCase().includes(x.toLowerCase())));
const sensitiveRecordMarkers = ["R100000"+"218772991", "med error"+" at work", "severe lows"+" that messed up my sleep"];
check("No sensitive private record snippets committed", sensitiveRecordMarkers.every(x => !publicText.toLowerCase().includes(x.toLowerCase())));


check("Today has exactly six checkbox inputs total", count(/type="checkbox"/g, markup.slice(markup.indexOf('id="today"'), markup.indexOf('id="reset"'))) === 6);
check("No support questionnaire in daily UI", !/id="dailySupportCard"/.test(markup));
check("One direct strength form, no workout engine", count(/id="strengthForm"/g,markup) === 1 && /function saveStrengthEntry/.test(html) && !/prompt\("Benchmark date/.test(html));
check("Custom strength exercises survive migration", /for \(const mission of incomingIron.missions/.test(html));
check("V65 restore compatibility remains", /project-northstar-winter-private-backup-v65/.test(html));
check("Strength form uses explicit save, never keystroke saves", /addEventListener\('submit', saveStrengthEntry\)/.test(html) && !/strengthForm.*addEventListener\('input'/.test(html));
check("One Hevy daily check", count(/data-check="hevy"/g,markup) === 1);
check("One LooksMax daily check", count(/data-check="looks"/g,markup) === 1);
check("Winter four-month phases", ["2026-11","2026-12","2027-01","2027-02"].every(m=>html.includes(`data-phase-month="${m}"`)));
check("Old progress archived before reset", /pre-winter-nov18-2026/.test(html) && /data: deepClone\(oldState.activeCampaign\)/.test(html));
check("Typing shortcut guard remains", /closest\("input, textarea, select, \[contenteditable=/.test(html));
check("V64 restore compatibility remains", /project-northstar-final92-private-backup-v64/.test(html));

const failed=checks.filter(c=>!c.pass);
for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}`);
console.log(`\n${checks.length-failed.length}/${checks.length} repository checks passed.`);
if (failed.length) process.exitCode=1;
