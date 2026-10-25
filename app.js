"use strict";
// BigMike: a lifting log that tells you what to lift next. Everything is stored on this phone.

// ---------------- helpers ----------------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clone = (o) => JSON.parse(JSON.stringify(o));
const DAY = 864e5;
const ymd = (d = new Date()) => { d = new Date(d); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const EX = (id) => BM_EX[id] || { name: id, equip: "machine", muscles: {}, alts: [] };
const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? null : n; };
const r1 = (n) => Math.round(n * 10) / 10;
const fmtW = (w) => (w == null ? "–" : String(r1(w)));
const e1rm = (w, r) => w * (1 + r / 30);
const weekStart = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); const wd = (d.getDay() + 6) % 7; return d.getTime() - wd * DAY; };
const primary = (id) => { const m = EX(id).muscles; return Object.keys(m).sort((a, b) => m[b] - m[a])[0] || "Other"; };
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ---------------- state ----------------
const KEY = "bigmike.v1";
function fresh() {
  return {
    v: 1, profile: null,
    settings: { inc: { barbell: 5, dumbbell: 5, machine: 5, cable: 5, bodyweight: 5 }, bar: 45, sound: true },
    plan: clone(BM_DAYS), next: 0, cycleStart: null,
    workouts: [], cur: null, protein: {}, sleep: {}, lastBackup: null, created: Date.now(),
  };
}
let S = null;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
if (!S || !S.v) S = fresh();
{
  const f = fresh();
  S = Object.assign(f, S);
  S.settings = Object.assign(fresh().settings, S.settings);
  S.settings.inc = Object.assign(fresh().settings.inc, S.settings.inc);
}
// One-time update: cable crunches became the ab crunch machine by default.
if (!S.machineCrunch) {
  S.plan.forEach((d) => d.items.forEach((i) => { if (i.ex === "cable_crunch") i.ex = "ab_crunch_machine"; }));
  S.machineCrunch = true;
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast("Couldn't save. Phone storage may be full."); }
}

let view = "today";
const ui = { planDay: 0, chartEx: null, openWorkout: null, restFired: true, pick: null, swapPlan: false };

// ---------------- training logic ----------------
const incOf = (id) => S.settings.inc[EX(id).equip] ?? 5;
const step = (w, id, dir = 1) => {
  const e = EX(id), inc = incOf(id);
  return e.assisted ? Math.max(0, w - inc * dir) : Math.max(0, w + inc * dir);
};

/** The most recent normal (not deload) session of this exercise. */
function lastSession(ex) {
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const w = S.workouts[i];
    if (w.deload) continue;
    const x = w.items.find((y) => y.ex === ex && y.sets.length);
    if (x) return { ...x, date: w.end };
  }
  return null;
}

/** What to lift today: double progression. Hit the top of the range on every set and the weight goes up. */
function suggest(it) {
  const e = EX(it.ex), L = lastSession(it.ex);
  if (!L) return { w: e.equip === "bodyweight" ? 0 : null, r: it.max, kind: "first" };
  const lw = L.sets[L.sets.length - 1].w;
  const atW = L.sets.filter((s) => s.w === lw);
  // Every set at or above the top of the range (an early jump mid-workout counts too).
  if (L.sets.length >= it.sets && L.sets.every((s) => s.r >= it.max)) return { w: step(lw, it.ex), r: it.min, kind: "up", last: L };
  const minR = Math.min(...atW.map((s) => s.r));
  if (atW.every((s) => s.r < it.min - 1) && lw > 0) return { w: step(lw, it.ex, -1), r: it.min, kind: "down", last: L };
  return { w: lw, r: Math.min(it.max, Math.max(it.min, minR + 1)), kind: "same", last: L };
}

function cycleWeek() { return S.cycleStart ? Math.floor((weekStart() - S.cycleStart) / (7 * DAY)) : 0; }
function isDeload() { return !!S.cycleStart && ((cycleWeek() % 6) + 6) % 6 === 5; }

/** Best estimated 1-rep max per session for an exercise, oldest first. */
function e1rmHistory(ex) {
  const out = [];
  for (const w of S.workouts) {
    if (w.deload) continue;
    const x = w.items.find((y) => y.ex === ex);
    if (!x || !x.sets.length) continue;
    out.push({ t: w.end, y: Math.max(...x.sets.map((s) => e1rm(s.w, s.r))) });
  }
  return out;
}

function stalls() {
  const ids = [...new Set(S.plan.flatMap((d) => d.items.map((i) => i.ex)))];
  const out = [];
  for (const id of ids) {
    const e = EX(id);
    if (e.assisted || e.equip === "bodyweight") continue;
    const h = e1rmHistory(id);
    if (h.length < 4) continue;
    const recent = Math.max(...h.slice(-3).map((p) => p.y));
    const before = Math.max(...h.slice(0, -3).map((p) => p.y));
    if (recent <= before) out.push(id);
  }
  return out;
}

function deloadAdvice() {
  if (isDeload() || !S.cycleStart || cycleWeek() % 6 < 2) return null;
  const rated = S.workouts.filter((w) => w.rating).slice(-4);
  if (rated.length === 4 && rated.reduce((a, w) => a + w.rating, 0) / 4 >= 8.5) return "Your last 4 workouts all felt very hard.";
  if (stalls().length >= 3) return "Several lifts have stopped moving.";
  return null;
}

function weekVolume(since) {
  const v = Object.fromEntries(BM_MUSCLES.map((m) => [m, 0]));
  S.workouts.filter((w) => w.end >= since).forEach((w) => w.items.forEach((i) => {
    const m = EX(i.ex).muscles;
    for (const k in m) v[k] = (v[k] || 0) + m[k] * i.sets.length;
  }));
  return v;
}
function planVolume() {
  const v = Object.fromEntries(BM_MUSCLES.map((m) => [m, 0]));
  S.plan.forEach((d) => d.items.forEach((i) => {
    const m = EX(i.ex).muscles;
    for (const k in m) v[k] = (v[k] || 0) + m[k] * i.sets;
  }));
  return v;
}

function warmups(it) {
  const e = EX(it.ex), w = num(it.w);
  if (!w || e.equip === "bodyweight" || e.equip === "cable" || e.assisted) return [];
  const inc = incOf(it.ex), min = e.equip === "barbell" ? S.settings.bar : 0;
  const round = (x) => Math.max(min, Math.round(x / inc) * inc);
  const list = [[0.5, 8], [0.75, 4]];
  if (w >= 95) list.push([0.9, 1]);
  return list.map(([p, r]) => ({ w: round(w * p), r })).filter((s) => s.w > 0 && s.w < w);
}

function plates(w) {
  let side = (w - S.settings.bar) / 2;
  if (side <= 0) return "just the bar";
  const out = [];
  for (const p of [45, 35, 25, 10, 5, 2.5]) while (side >= p - 0.01) { out.push(p); side -= p; }
  return out.length ? out.join(" + ") + " per side" + (side > 0.1 ? " (not exact)" : "") : "just the bar";
}

// ---------------- protein & sleep ----------------
const proteinTarget = () => Math.round((S.profile?.weight || 140) * 0.8);
const proteinOn = (d = ymd()) => (S.protein[d] || []).reduce((a, b) => a + b.g, 0);
const QUICK = [
  { g: 25, label: "Palm of meat or fish" }, { g: 15, label: "Greek yogurt" }, { g: 25, label: "Protein shake" },
  { g: 12, label: "2 eggs" }, { g: 20, label: "Protein bar" }, { g: 8, label: "Glass of milk" },
];

// ---------------- frog ----------------
function frog(size = 64, mood = "happy") {
  const flex = mood === "flex";
  return `<svg class="frog" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">
  ${flex ? '<g transform="rotate(-8 50 14)"><rect x="22" y="11" width="56" height="5" rx="2.5" fill="#5b6470"/><rect x="16" y="4" width="9" height="19" rx="3" fill="#39414b"/><rect x="75" y="4" width="9" height="19" rx="3" fill="#39414b"/></g>' : ""}
  <ellipse cx="50" cy="63" rx="39" ry="29" fill="#5fbf68"/>
  <circle cx="29" cy="38" r="15" fill="#5fbf68"/><circle cx="71" cy="38" r="15" fill="#5fbf68"/>
  <ellipse cx="50" cy="74" rx="24" ry="13" fill="#a8e2a0"/>
  <circle cx="29" cy="38" r="9.5" fill="#fff"/><circle cx="71" cy="38" r="9.5" fill="#fff"/>
  <circle cx="31" cy="39" r="5.2" fill="#1d2420"/><circle cx="69" cy="39" r="5.2" fill="#1d2420"/>
  <circle cx="32.8" cy="36.8" r="1.8" fill="#fff"/><circle cx="70.8" cy="36.8" r="1.8" fill="#fff"/>
  <ellipse cx="22" cy="61" rx="6" ry="3.4" fill="#f39ab0" opacity=".75"/><ellipse cx="78" cy="61" rx="6" ry="3.4" fill="#f39ab0" opacity=".75"/>
  <path d="M35 60 Q50 ${flex ? 74 : 70} 65 60" stroke="#2d5a32" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  ${flex ? '<path d="M14 56 q-8 -14 2 -24" stroke="#5fbf68" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M86 56 q8 -14 -2 -24" stroke="#5fbf68" stroke-width="8" fill="none" stroke-linecap="round"/>' : ""}
  </svg>`;
}

// ---------------- small UI pieces ----------------
function ring(frac, size = 120, stroke = 11, color = "var(--accent)", inner = "") {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return `<div class="ring" style="width:${size}px;height:${size}px">
  <svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--track)" stroke-width="${stroke}" fill="none"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
   stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>
  <div class="ring-in">${inner}</div></div>`;
}

function lineChart(pts, unit = "lb") {
  if (pts.length < 2) return `<p class="muted small">Log this lift a couple of times to see a line here.</p>`;
  const W = 320, H = 150, P = 26;
  const xs = pts.map((p) => p.t), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 5) { y0 -= 3; y1 += 3; }
  const X = (t) => P + ((t - x0) / Math.max(1, x1 - x0)) * (W - P - 10);
  const Y = (y) => H - 18 - ((y - y0) / (y1 - y0)) * (H - 36);
  const d = pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.y).toFixed(1)).join(" ");
  const fmtD = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart">
  <line x1="${P}" x2="${W - 10}" y1="${Y(y1)}" y2="${Y(y1)}" class="grid"/><line x1="${P}" x2="${W - 10}" y1="${Y(y0)}" y2="${Y(y0)}" class="grid"/>
  <text x="${P - 4}" y="${Y(y1) + 4}" text-anchor="end" class="axis">${Math.round(y1)}</text>
  <text x="${P - 4}" y="${Y(y0) + 4}" text-anchor="end" class="axis">${Math.round(y0)}</text>
  <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  ${pts.map((p) => `<circle cx="${X(p.t)}" cy="${Y(p.y)}" r="3.2" fill="var(--accent)"/>`).join("")}
  <text x="${P}" y="${H - 2}" class="axis">${fmtD(x0)}</text><text x="${W - 10}" y="${H - 2}" text-anchor="end" class="axis">${fmtD(x1)}</text>
  </svg>`;
}

function bars(items, max, goal) {
  const W = 320, H = 120, bw = W / items.length;
  const top = Math.max(max, ...items.map((i) => i.v), 1);
  return `<svg viewBox="0 0 ${W} ${H + 18}" class="chart">
  ${goal ? `<line x1="0" x2="${W}" y1="${H - (goal / top) * H}" y2="${H - (goal / top) * H}" class="goal"/>` : ""}
  ${items.map((it, i) => { const h = (it.v / top) * H; return `<rect x="${i * bw + bw * 0.18}" y="${H - h}" width="${bw * 0.64}" height="${Math.max(h, it.v ? 2 : 0)}" rx="4" fill="${it.dim ? "var(--track)" : "var(--accent)"}"/>
    <text x="${i * bw + bw / 2}" y="${H + 14}" text-anchor="middle" class="axis">${esc(it.l)}</text>`; }).join("")}
  </svg>`;
}

function stepper(key, value, unit, extra = "") {
  return `<div class="stepper">
    <button class="sbtn" data-a="adj" data-k="${key}" data-d="-1" aria-label="less">−</button>
    <label class="sval"><input data-in="${key}" inputmode="decimal" value="${value == null ? "" : r1(value)}" placeholder="?" ${extra}><span>${unit}</span></label>
    <button class="sbtn" data-a="adj" data-k="${key}" data-d="1" aria-label="more">+</button></div>`;
}

let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function openSheet(html) {
  const sh = $("#sheet"), card = sh.querySelector(".sheet-card");
  // Already open: swap the contents in place (no slide-up again, scroll position kept).
  if (sh.classList.contains("open") && card) {
    card.innerHTML = `<div class="grab"></div><button class="sheet-x" data-a="closeSheet" aria-label="Close">×</button>${html}`;
    return;
  }
  sh.innerHTML = `<div class="sheet-back" data-a="closeSheet"></div><div class="sheet-card"><div class="grab"></div><button class="sheet-x" data-a="closeSheet" aria-label="Close">×</button>${html}</div>`;
  sh.classList.add("open");
}
function closeSheet() { $("#sheet").classList.remove("open"); $("#sheet").innerHTML = ""; ui.pick = null; }

// ---------------- views ----------------
function vSetup() {
  return `<div class="setup">
  <div class="center">${frog(120)}</div>
  <h1 class="center">Hi, I'm BigMike</h1>
  <p class="center muted">I plan your lifts, remember every set, and tell you when to go heavier. Everything stays on this phone.</p>
  <div class="card">
    <h3>Your body weight</h3>
    <p class="muted small">Only used to estimate a protein goal. You can change it any time.</p>
    <div class="row"><input id="setupW" class="big-in" inputmode="decimal" placeholder="e.g. 140"><span class="unit">lb</span></div>
  </div>
  <div class="card">
    <h3>How it works</h3>
    <ul class="how">
      <li><b>6 days, in order:</b> Push, Pull, Legs, then a second version of each. Miss a day and it just waits for you.</li>
      <li><b>Each lift has a rep range</b> like 8–12. Hit the top of the range on every set and I'll add weight next time.</li>
      <li><b>First week:</b> I don't know your weights yet. Pick one you could do about 12 times with good form and I'll learn from there.</li>
      <li><b>Every 6th week is lighter</b> so your body can catch up.</li>
    </ul>
  </div>
  <button class="btn filled wide" data-a="finishSetup">Let's lift</button>
  </div>`;
}

const FOCUS = { push: "Chest, shoulders, triceps", pull: "Back, rear delts, biceps", legs: "Legs" };
function focusOf(d) { return d.sub || FOCUS[d.id.split("_")[0]] || [...new Set(d.items.map((i) => primary(i.ex)))].slice(0, 3).join(", "); }
function minutesOf(d) { const s = d.items.reduce((a, i) => a + i.sets * (i.rest + 45), 0); return Math.max(20, Math.round(s / 60 / 5) * 5); }
const CHEV = `<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>`;

function vToday() {
  if (!S.profile) return vSetup();
  if (S.cur) return S.cur.finishing ? vSummary() : vWorkout();
  const ni = S.next % S.plan.length, day = S.plan[ni];
  const now = new Date();
  const thisWeek = S.workouts.filter((w) => w.end >= weekStart()).length;
  const cards = [];

  if (!S.sleep[ymd()] && S.sleepAsked !== ymd()) cards.push(sleepCard(true));
  if (isDeload()) cards.push(`<div class="card tonal"><h3>Lighter week</h3><p>Week 6 is for recovery. Half the sets at your normal weights, and stop each set with 3 or more reps left. You'll come back stronger.</p><button class="btn text" data-a="skipDeload">Skip it this time</button></div>`);
  const adv = deloadAdvice();
  if (adv) cards.push(`<div class="card tonal"><h3>Maybe take a lighter week?</h3><p>${adv} A lighter week now usually helps more than pushing through.</p><button class="btn tonal-btn" data-a="deloadNow">Start lighter week</button></div>`);
  if (S.workouts.length >= 5 && (!S.lastBackup || Date.now() - S.lastBackup > 30 * DAY)) cards.push(`<div class="card tonal"><h3>Save a backup</h3><p>Your workouts only live on this phone. A backup file keeps them safe.</p><button class="btn tonal-btn" data-a="export">Save backup</button></div>`);

  const others = S.plan.map((d, i) => i === ni ? "" : `<button class="btn outline" data-a="startDay" data-i="${i}">${esc(d.name)}</button>`).join("");
  const pg = proteinOn(), pt = proteinTarget();
  return `<header class="page-head"><div><div class="eyebrow">${WEEKDAY[now.getDay()]}</div><h1>Let's lift</h1></div>${frog(60)}</header>
  ${cards.join("")}
  <div class="card hi">
    <h3>Start a workout</h3>
    <p class="sub">What are we training?</p>
    <button class="btn filled wide big" data-a="start">${esc(day.name)} · next up</button>
    <button class="row-link" data-a="previewDay" data-i="${ni}"><span>${esc(focusOf(day))} · ${day.items.length} lifts · ~${minutesOf(day)} min</span>${CHEV}</button>
    <div class="grid2">${others}</div>
  </div>
  <h2 class="section">This week</h2>
  <div class="card">
    <div class="row between"><span>${thisWeek === 0 ? "No workouts yet" : thisWeek >= 6 ? "All 6 done!" : `${thisWeek} of 6 workouts`}</span><span class="muted small">Week ${(((cycleWeek() % 6) + 6) % 6) + 1} of 6</span></div>
    <div class="dots">${Array.from({ length: 6 }, (_, i) => `<span class="dot ${i < thisWeek ? "on" : ""}"></span>`).join("")}</div>
  </div>
  <h2 class="section">Protein today</h2>
  <button class="card nav-card" data-a="go" data-v="log">
    ${ring(pg / pt, 64, 7, "var(--accent)", `<b>${pg}</b>`)}
    <div class="grow"><div class="t">${pg} of ${pt} g</div><div class="muted small">${pg >= pt ? "Goal hit. Nice." : "Tap to add what you've eaten"}</div></div>${CHEV}
  </button>`;
}

function sleepCard(once) {
  return `<div class="card tonal">
    <div class="row between"><h3>How did you sleep last night?</h3>${once ? '<button class="btn text" data-a="skipSleep">Skip</button>' : ""}</div>
    <div class="row between"><span class="muted">Hours</span>${stepper("sleepH", ui.sleepH ?? 7.5, "h")}</div>
    <div class="seg">${["Poor", "Okay", "Great"].map((q) => `<button class="${ui.sleepQ === q ? "on" : ""}" data-a="sleepQ" data-q="${q}">${q}</button>`).join("")}</div>
    <button class="btn filled wide" data-a="saveSleep">Save</button>
  </div>`;
}

// ---- workout: one focused screen at a time (set, then rest), like Clyde's gym pop-up ----
const pending = (it) => !it.skipped && it.done.length < it.sets;
function firstPending() { return S.cur.items.findIndex(pending); }
/** Keeps the lift on screen at the top of the queue, so "now" always means the same lift. */
function normalizeOrder() {
  const c = S.cur;
  if (!c) return;
  const it = c.items[c.idx];
  if (!it || !pending(it)) { c.idx = firstPending(); return; }
  const fp = firstPending();
  if (fp >= 0 && fp !== c.idx) { c.items.splice(c.idx, 1); c.items.splice(fp, 0, it); c.idx = fp; }
}
function aimText(it) {
  const e = EX(it.ex), w = num(it.w);
  const wTxt = w == null ? "Pick a weight" : e.assisted ? `${fmtW(w)} lb assist` : e.equip === "bodyweight" && !w ? "Bodyweight" : `${fmtW(w)} lb${e.equip === "dumbbell" ? " each" : ""}`;
  return `${wTxt} × ${it.r ?? it.max}`;
}
function lastText(it) {
  const L = it.sg?.last;
  return L ? "Last time: " + L.sets.map((s) => `${fmtW(s.w)}×${s.r}`).join(", ") : null;
}
function nextBlip(c) {
  const rest = c.items.filter((it, i) => i !== c.idx && pending(it));
  if (!rest.length) return `<button class="blip" data-a="queue"><span class="muted">Last lift of the day</span>${CHEV}</button>`;
  return `<button class="blip" data-a="queue"><span><span class="muted">Up next:</span> ${esc(EX(rest[0].ex).name)}${rest.length > 1 ? `<span class="muted"> +${rest.length - 1}</span>` : ""}</span>${CHEV}</button>`;
}
function wkTop(c, label) {
  const done = c.items.filter((i) => !pending(i)).length;
  return `<div class="wk-top">
    <button class="btn text small danger" data-a="finish">End</button>
    <div class="wk-title"><b>${esc(c.dayName)}</b><span>${label || `${done} of ${c.items.length} lifts done`}</span></div>
    <button class="btn text small" data-a="queue"><svg class="ico" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Queue</button>
  </div>`;
}

function vWorkout() {
  const c = S.cur;
  if (firstPending() < 0) {
    return wkTop(c) + `<div class="focus center">${frog(130, "flex")}<h1>That's everything!</h1><p class="sub">Nice work. Wrap it up and rate how hard it felt.</p>
      <button class="btn filled wide big" data-a="finish">Finish workout</button></div>`;
  }
  normalizeOrder();
  if (c.restEnd) return vRest(c);
  const it = c.items[c.idx], e = EX(it.ex), sg = it.sg || {};
  let hint = "";
  if (c.deload) hint = "Lighter week: stop with 3 or more reps left in the tank.";
  else if (it.bumped) hint = `Strong set, so ${e.assisted ? "the assist dropped" : "the weight went up"} for the rest.`;
  else if (sg.kind === "first") hint = e.equip === "bodyweight" ? "Log 0, or the plate you hold." : `First time: pick a weight you could do about ${it.max} times with good form.`;
  else if (sg.kind === "up") hint = `You hit ${it.max} on every set last time, so ${e.assisted ? "less assist" : "it's up " + incOf(it.ex) + " lb"}.`;
  else if (sg.kind === "down") hint = `${e.assisted ? "More assist" : "A bit lighter"} so you land in the range.`;
  const last = lastText(it);
  const wu = it.done.length === 0 ? warmups(it) : [];
  const wLabel = e.assisted ? "lb assist" : e.equip === "dumbbell" ? "lb each" : "lb";
  const plate = e.equip === "barbell" && num(it.w) ? `<div class="muted small center">${plates(num(it.w))}</div>` : "";
  const doneRow = it.done.length ? `<div class="donesets">${it.done.map((s, i) => `<button data-a="editSet" data-i="${i}">✓ ${fmtW(s.w)}×${s.r}</button>`).join("")}</div>` : "";
  const h = e.howto;
  const how = h ? `<div class="howto ${ui.howOpen ? "open" : ""}">
      <button class="how-head" data-a="toggleHow"><span>How to do it</span><svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>
      ${ui.howOpen ? `<div class="how-body"><p><b>Setup.</b> ${esc(h.setup)}</p><ol>${h.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <p><b>Key cue.</b> ${esc(h.cue)}</p><p><b>Avoid.</b> ${esc(h.mistake)}</p>
        <a class="btn text small" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.name + " proper form")}" target="_blank" rel="noopener">Watch a demo ↗</a></div>` : ""}
    </div>` : "";

  return wkTop(c) + `<div class="focus">
    <div class="eyebrow-set">Set ${it.done.length + 1} of ${it.sets}</div>
    <h1 class="exname">${esc(e.name)}</h1>
    <div class="range">${it.min}–${it.max} reps · rest ${fmtRest(it.rest)} after</div>
    ${last ? `<div class="lastline">${last}</div>` : ""}
    ${hint ? `<div class="hint">${hint}</div>` : ""}
    ${wu.length ? `<div class="warm"><span class="muted small">Warm up:</span> ${wu.map((s, i) => `<button class="chip tiny ${it.wu?.[i] ? "on" : ""}" data-a="wu" data-i="${i}">${fmtW(s.w)}×${s.r}</button>`).join("")}</div>` : ""}
    <div class="big-inputs">
      <div><div class="lbl">Weight</div>${stepper("w", it.w, wLabel)}</div>
      <div><div class="lbl">Reps</div>${stepper("r", it.r, "reps")}</div>
    </div>
    ${plate}
    <button class="btn filled wide huge" data-a="doneSet">Set done ✓</button>
    ${doneRow}
    <div class="row3">
      <button class="btn tonal-btn" data-a="skipSet">Skip set</button>
      <button class="btn tonal-btn" data-a="skip">Skip lift</button>
      <button class="btn tonal-btn" data-a="swap">Swap</button>
    </div>
    ${how}
    ${nextBlip(c)}
  </div>`;
}

function vRest(c) {
  const it = c.items[c.idx];
  const left = Math.ceil((c.restEnd - Date.now()) / 1000);
  const over = left <= 0;
  const last = lastText(it);
  return wkTop(c, "Resting") + `<div class="focus center rest-page ${over ? "over" : ""}">
    <div class="eyebrow-set">${over ? "Time's up" : "Rest"}</div>
    <div id="bigring" class="bigring"></div>
    <div class="next-up"><span class="muted">Next:</span> ${esc(EX(it.ex).name)}<br><span class="muted">set ${it.done.length + 1} of ${it.sets}</span></div>
    <div class="aim">${aimText(it)}</div>
    ${last ? `<div class="lastline">${last}</div>` : ""}
    ${over ? `<button class="btn filled wide huge" data-a="restSkip">Start set ${it.done.length + 1}</button>`
      : `<div class="row3"><button class="btn tonal-btn" data-a="restAdd" data-s="-15">−15s</button><button class="btn tonal-btn" data-a="restAdd" data-s="30">+30s</button><button class="btn filled" data-a="restSkip">Skip rest</button></div>`}
    ${nextBlip(c)}
  </div>`;
}

function queueSheet() {
  const c = S.cur;
  normalizeOrder();
  const cur = firstPending();
  const pend = c.items.map((it, i) => ({ it, i })).filter((x) => pending(x.it));
  const gone = c.items.map((it, i) => ({ it, i })).filter((x) => !pending(x.it));
  const row = ({ it, i }) => `<li data-i="${i}">
      <span class="handle" aria-label="Drag to reorder"><svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg></span>
      <div class="list-row"><span class="grow"><span class="t">${esc(EX(it.ex).name)}${i === cur ? ' <span class="badge">now</span>' : ""}</span>
        <span class="muted small">${it.done.length ? `${it.done.length} of ${it.sets} sets done` : `${it.sets} × ${it.min}–${it.max}`}</span></span>
        ${i === cur ? "" : `<button class="btn outline small" data-a="doNow" data-i="${i}">Do now</button>`}
        <button class="icon-btn sm" data-a="qSwap" data-i="${i}" aria-label="Swap"><svg class="ico" viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg></button>
      </div></li>`;
  openSheet(`<h2>Workout queue</h2>
    <p class="muted small">Drag <svg class="inline" viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg> to change the order. The top one is what you do now.</p>
    <div class="card list inset"><ul id="queueList">${pend.map(row).join("")}</ul></div>
    ${gone.length ? `<h4>Done</h4><ul class="plain">${gone.map(({ it, i }) => `<li><span>${it.skipped ? "" : "✓ "}${esc(EX(it.ex).name)}</span>${it.skipped ? `<button class="btn text small" data-a="unskip" data-i="${i}">Skipped · undo</button>` : `<span class="muted">${it.done.map((s) => `${fmtW(s.w)}×${s.r}`).join(", ")}</span>`}</li>`).join("")}</ul>` : ""}
    <button class="btn filled wide" data-a="closeSheet">Back to lifting</button>`);
}

function fmtRest(s) { return s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s / 60} min`) : `${s}s`; }

function sessionStats(c) {
  let sets = 0, vol = 0;
  const prs = [];
  c.items.forEach((it) => {
    if (!it.done.length) return;
    sets += it.done.length;
    if (!EX(it.ex).assisted) vol += it.done.reduce((a, s) => a + s.w * s.r, 0);
    const prev = e1rmHistory(it.ex);
    const best = Math.max(...it.done.map((s) => e1rm(s.w, s.r)));
    if (prev.length && !EX(it.ex).assisted && best > Math.max(...prev.map((p) => p.y)) + 0.5) prs.push(EX(it.ex).name);
  });
  return { sets, vol: Math.round(vol), prs, min: Math.round((Date.now() - c.start) / 60000) };
}

function vSummary() {
  const c = S.cur, st = sessionStats(c);
  const labels = { 1: "Very easy", 3: "Easy", 5: "Solid", 7: "Hard", 9: "Very hard", 10: "Max effort" };
  return `<div class="center">${frog(120, "flex")}<h1>Workout done!</h1></div>
  <div class="tiles">
    <div class="tile"><b>${st.min}</b><span>minutes</span></div>
    <div class="tile"><b>${st.sets}</b><span>sets</span></div>
    <div class="tile"><b>${st.vol.toLocaleString()}</b><span>lb moved</span></div>
  </div>
  ${st.prs.length ? `<div class="card note"><h3>New bests</h3><p>${st.prs.map(esc).join(", ")}</p></div>` : ""}
  <div class="card">
    <h3>How hard was it overall?</h3>
    <div class="rate">${Array.from({ length: 10 }, (_, i) => `<button class="${ui.rating === i + 1 ? "on" : ""}" data-a="rate" data-r="${i + 1}">${i + 1}</button>`).join("")}</div>
    <div class="muted small center">${ui.rating ? labels[ui.rating] || (ui.rating < 5 ? "Easy" : ui.rating < 7 ? "Solid" : "Hard") : "1 is a warm-up, 10 is everything you had"}</div>
    <button class="btn filled wide" data-a="saveWorkout">Save workout</button>
  </div>
  <div class="row gap center-row"><button class="btn outline small" data-a="backToWorkout">Back to workout</button><button class="btn text small danger" data-a="discard">Discard</button></div>`;
}

function vPlan() {
  if (ui.planOpen != null && S.plan[ui.planOpen]) return vPlanDay(ui.planOpen);
  const ni = S.next % S.plan.length;
  const rows = S.plan.map((d, i) => `<li><button class="list-row" data-a="openDay" data-i="${i}">
      <span class="num ${i === ni ? "on" : ""}">${i + 1}</span>
      <span class="grow"><span class="t">${esc(d.name)}${i === ni ? ' <span class="badge">next up</span>' : ""}</span><span class="muted small">${esc(focusOf(d))} · ${d.items.length} lifts</span></span>${CHEV}
    </button></li>`).join("");
  const pv = planVolume();
  const mrows = BM_MUSCLES.map((m) => { const v = r1(pv[m] || 0), cls = v >= 10 ? "good" : v >= 6 ? "mid" : "low";
    return `<div class="mrow"><span>${m}</span><div class="mbar"><i class="${cls}" style="width:${Math.min(100, (v / 20) * 100)}%"></i><em style="left:50%"></em></div><b>${v}</b></div>`; }).join("");
  return `<header class="page-head"><div><h1>Plan</h1><p class="sub">Six days that run in order. Miss one and it waits for you.</p></div></header>
  <div class="card list"><ul>${rows}</ul></div>
  <h2 class="section">Weekly sets per muscle</h2>
  <div class="card"><p class="muted small">10 to 20 hard sets a week is the sweet spot for growth. The line marks 10.</p>${mrows}</div>`;
}

function vPlanDay(di) {
  const d = S.plan[di], ni = S.next % S.plan.length;
  const rows = d.items.map((it, i) => `<li data-i="${i}">
      <span class="handle" aria-label="Drag to reorder"><svg viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg></span>
      <button class="list-row" data-a="editItem" data-i="${i}"><span class="grow"><span class="t">${esc(EX(it.ex).name)}</span><span class="muted small">${it.sets} × ${it.min}–${it.max} reps · rest ${fmtRest(it.rest)}</span></span>${CHEV}</button>
    </li>`).join("");
  return `<button class="back" data-a="closeDay"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>Plan</button>
  <header class="page-head"><div><h1>${esc(d.name)}</h1><p class="sub">${esc(focusOf(d))} · ~${minutesOf(d)} min</p></div></header>
  <p class="hint-line">Hold <svg class="inline" viewBox="0 0 24 24"><path d="M5 9h14M5 15h14"/></svg> and drag to reorder. Tap a lift to change it.</p>
  <div class="card list"><ul id="dragList">${rows}</ul></div>
  <button class="btn tonal-btn wide" data-a="addEx">+ Add exercise</button>
  ${di === ni ? "" : `<button class="btn outline wide" data-a="pickDay" data-i="${di}">Make this next up</button>`}
  <button class="btn text wide" data-a="resetDay">Reset to the original</button>`;
}

function vProgress() {
  const ws = weekStart();
  const thisW = S.workouts.filter((w) => w.end >= ws);
  const last7 = S.workouts.filter((w) => w.rating).slice(-7);
  const avgRate = last7.length ? r1(last7.reduce((a, w) => a + w.rating, 0) / last7.length) : "–";
  const nights = Object.entries(S.sleep).filter(([d]) => d >= ymd(Date.now() - 6 * DAY)).map(([, s]) => s.h);
  const avgSleep = nights.length ? r1(nights.reduce((a, b) => a + b, 0) / nights.length) : "–";
  const pDays = Array.from({ length: 7 }, (_, i) => proteinOn(ymd(Date.now() - i * DAY))).filter((g) => g > 0);
  const avgP = pDays.length ? Math.round(pDays.reduce((a, b) => a + b, 0) / pDays.length) : "–";

  const vol = weekVolume(ws);
  const muscles = BM_MUSCLES.map((m) => {
    const v = r1(vol[m] || 0), pct = Math.min(100, (v / 20) * 100);
    return `<div class="mrow"><span>${m}</span><div class="mbar"><i style="width:${pct}%"></i><em style="left:50%"></em></div><b>${v}</b></div>`;
  }).join("");

  const mainIds = BM_MAIN.filter((id) => S.plan.some((d) => d.items.some((i) => i.ex === id)))
    .concat([...new Set(S.workouts.flatMap((w) => w.items.map((i) => i.ex)))].filter((id) => !BM_MAIN.includes(id) && !EX(id).assisted && EX(id).equip !== "bodyweight"));
  if (!ui.chartEx || !mainIds.includes(ui.chartEx)) ui.chartEx = mainIds[0];
  const hist = ui.chartEx ? e1rmHistory(ui.chartEx) : [];
  const best = hist.length ? Math.round(Math.max(...hist.map((p) => p.y))) : null;

  const weeks = Array.from({ length: 8 }, (_, i) => { const s = ws - (7 - i) * 7 * DAY, e = s + 7 * DAY; return { l: new Date(s).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }), v: S.workouts.filter((w) => w.end >= s && w.end < e).length }; });
  const st = stalls();

  return `<header class="page-head"><h1>Progress</h1></header>
  <div class="tiles four">
    <div class="tile"><b>${thisW.length}</b><span>workouts this week</span></div>
    <div class="tile"><b>${avgRate}</b><span>avg difficulty</span></div>
    <div class="tile"><b>${avgSleep}</b><span>avg sleep (h)</span></div>
    <div class="tile"><b>${avgP}</b><span>avg protein (g)</span></div>
  </div>
  <div class="card">
    <h3>Strength</h3>
    <p class="muted small">Estimated 1-rep max from your best set each session. You never have to test it; it rises as your sets get heavier or longer.</p>
    <div class="chips scroll">${mainIds.map((id) => `<button class="chip ${id === ui.chartEx ? "on" : ""}" data-a="chartEx" data-ex="${id}">${esc(EX(id).name)}</button>`).join("")}</div>
    ${lineChart(hist)}
    ${best ? `<div class="muted small">Best so far: <b>${best} lb</b></div>` : ""}
  </div>
  ${st.length ? `<div class="card note"><h3>Stuck lifts</h3><p>${st.map((id) => esc(EX(id).name)).join(", ")} ${st.length > 1 ? "haven't" : "hasn't"} gone up in 3 sessions. Check sleep and protein first. If it stays stuck, swap to a similar exercise for a few weeks.</p></div>` : ""}
  <div class="card">
    <h3>Sets per muscle this week</h3>
    <p class="muted small">The line marks 10 sets, a good weekly minimum for growth.</p>
    ${muscles}
  </div>
  <div class="card"><h3>Workouts per week</h3>${bars(weeks, 6, 6)}</div>
  <div class="card"><h3>Week ${(((cycleWeek() % 6) + 6) % 6) + 1} of 6</h3><p class="muted small">${isDeload() ? "This is the lighter week." : "Week 6 is a lighter recovery week."}</p></div>`;
}

function vLog() {
  const pg = proteinOn(), pt = proteinTarget(), w = S.profile?.weight || 140;
  const entries = (S.protein[ymd()] || []).map((e, i) => `<li><span>${esc(e.label)}</span><span>${e.g} g <button class="x" data-a="delP" data-i="${i}" aria-label="Remove">×</button></span></li>`).join("");
  const nights = Array.from({ length: 7 }, (_, i) => { const d = ymd(Date.now() - (6 - i) * DAY); const s = S.sleep[d]; return { l: "SMTWTFS"[new Date(d + "T12:00").getDay()], v: s ? s.h : 0 }; });
  const todaySleep = S.sleep[ymd()];
  const recent = S.workouts.slice(-25).reverse().map((wk) => {
    const open = ui.openWorkout === wk.id;
    const sets = wk.items.reduce((a, i) => a + i.sets.length, 0);
    const detail = open ? `<div class="wdetail">${wk.items.map((i) => `<div><b>${esc(EX(i.ex).name)}</b><span class="muted"> ${i.sets.map((s) => `${fmtW(s.w)}×${s.r}`).join(", ")}</span></div>`).join("")}
      <button class="btn text small danger" data-a="delWorkout" data-id="${wk.id}">Delete workout</button></div>` : "";
    return `<li class="wk" data-a="openWorkout" data-id="${wk.id}"><div class="row between"><div><b>${esc(wk.dayName)}</b>${wk.deload ? ' <span class="pill">light</span>' : ""}<div class="muted small">${new Date(wk.end).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · ${sets} sets</div></div>${wk.rating ? `<span class="pill">${wk.rating}/10</span>` : ""}</div>${detail}</li>`;
  }).join("");

  return `<header class="page-head"><h1>Log</h1></header>
  <div class="card">
    <h3>Protein today</h3>
    <div class="row gap">${ring(pg / pt, 110, 11, "var(--accent)", `<b class="bignum">${pg}</b><span class="tiny muted">of ${pt} g</span>`)}
    <p class="muted small">A good goal for building muscle is about 0.7 to 1 g per pound of body weight: <b>${Math.round(w * 0.7)}–${Math.round(w)} g</b> for you. These are rough guesses, close enough to steer by.</p></div>
    <div class="quick">${QUICK.map((q) => `<button class="qbtn" data-a="addP" data-g="${q.g}" data-l="${esc(q.label)}"><b>+${q.g} g</b><span>${esc(q.label)}</span></button>`).join("")}
      <button class="qbtn" data-a="customP"><b>+ ? g</b><span>Other (from a label)</span></button></div>
    ${entries ? `<ul class="plist">${entries}</ul>` : ""}
  </div>
  <div class="card">
    <h3>Sleep</h3>
    ${todaySleep ? `<p>Last night: <b>${todaySleep.h} h</b>, ${esc(todaySleep.q || "")} <button class="link" data-a="redoSleep">change</button></p>` : sleepCard().replace('<div class="card tonal">', "<div>").replace(/<div class="row between"><h3>.*?<\/h3><\/div>/, "")}
    ${bars(nights, 9, 8)}
    <p class="muted small">The line marks 8 hours. Muscle is built while you sleep, so 7 to 9 hours makes a big difference.</p>
  </div>
  <div class="card"><h3>Past workouts</h3>${recent ? `<ul class="wlist">${recent}</ul>` : '<p class="muted">Nothing yet. Your first one will show up here.</p>'}</div>`;
}

function vSettings() {
  const inc = S.settings.inc;
  const incRow = (k, label) => `<div class="row between"><span>${label}</span><div class="seg small">${[2.5, 5, 10].map((v) => `<button class="${inc[k] === v ? "on" : ""}" data-a="inc" data-k="${k}" data-v="${v}">${v}</button>`).join("")}</div></div>`;
  return `<header class="page-head"><h1>Settings</h1></header>
  <div class="card"><h3>Body weight</h3><div class="row"><input class="big-in" data-in="bw" inputmode="decimal" value="${S.profile?.weight ?? ""}"><span class="unit">lb</span></div><p class="muted small">Sets your protein goal.</p></div>
  <div class="card"><h3>Weight jumps (lb)</h3><p class="muted small">How much to add when you move up. Use the smallest jump your gym has.</p>
    ${incRow("barbell", "Barbell")}${incRow("dumbbell", "Dumbbells")}${incRow("machine", "Machines")}${incRow("cable", "Cables")}
    <div class="row between"><span>Barbell weight</span><div class="seg small">${[35, 45].map((v) => `<button class="${S.settings.bar === v ? "on" : ""}" data-a="bar" data-v="${v}">${v}</button>`).join("")}</div></div>
  </div>
  <div class="card"><h3>Rest timer</h3>
    <div class="row between"><span>Beep when rest is over</span><button class="toggle ${S.settings.sound ? "on" : ""}" data-a="sound" aria-label="Sound"><i></i></button></div>
    <p class="muted small">The screen also flashes green. The timer only alerts while BigMike is open, so it keeps the screen awake during a workout. Your phone's silent switch can mute the beep.</p>
  </div>
  <div class="card"><h3>Lighter weeks</h3><p class="muted small">You're in week ${(((cycleWeek() % 6) + 6) % 6) + 1} of 6. Week 6 is lighter.</p>
    <div class="row gap"><button class="btn tonal-btn small" data-a="deloadNow">Lighter week now</button><button class="btn outline small" data-a="skipDeload">Restart at week 1</button></div></div>
  <div class="card"><h3>Backup</h3>
    <p class="muted small">${S.lastBackup ? "Last backup " + new Date(S.lastBackup).toLocaleDateString() : "No backup yet"}. Save it to Files or send it to yourself.</p>
    <div class="row gap"><button class="btn tonal-btn small" data-a="export">Save backup</button><label class="btn outline small">Restore<input type="file" accept="application/json,.json" id="importFile" hidden></label></div>
  </div>
  <div class="card"><h3>About</h3><p class="muted small">BigMike v1. Your data stays on this phone; nothing is sent anywhere.</p>
    <button class="btn text small danger" data-a="wipe">Erase everything</button></div>`;
}

// ---------------- sheets ----------------
function howtoSheet(id) {
  const e = EX(id), h = e.howto;
  if (!h) return openSheet(`<h2>${esc(e.name)}</h2><p>No notes for this one yet.</p>`);
  const q = encodeURIComponent(e.name + " proper form");
  openSheet(`<h2>${esc(e.name)}</h2>
    <div class="muscles">${Object.entries(e.muscles).map(([m, v]) => `<span class="pill ${v >= 1 ? "" : "soft"}">${m}</span>`).join("")}</div>
    <h4>Setup</h4><p>${esc(h.setup)}</p>
    <h4>Do it</h4><ol>${h.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
    <h4>Key cue</h4><p>${esc(h.cue)}</p>
    <h4>Common mistake</h4><p>${esc(h.mistake)}</p>
    <a class="btn tonal-btn wide" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">Watch a demo</a>`);
}

function pickSheet(title, current, onPick) {
  ui.pick = onPick;
  const alts = (EX(current)?.alts || []).filter((a) => BM_EX[a]);
  const groups = {};
  Object.keys(BM_EX).forEach((id) => { if (id !== current) (groups[primary(id)] ||= []).push(id); });
  const row = (id) => `<button class="pick" data-a="pick" data-ex="${id}"><span>${esc(EX(id).name)}</span><span class="muted small">${esc(EX(id).equip)}</span></button>`;
  openSheet(`<h2>${esc(title)}</h2>
    ${current && view === "today" ? `<label class="check"><input type="checkbox" id="swapPlan" ${ui.swapPlan ? "checked" : ""}> Also change it in my plan</label>` : ""}
    ${alts.length ? `<h4>Similar</h4>${alts.map(row).join("")}` : ""}
    ${BM_MUSCLES.filter((m) => groups[m]).map((m) => `<h4>${m}</h4>${groups[m].map(row).join("")}`).join("")}`);
}

function itemSheet(i) {
  const it = S.plan[ui.planDay].items[i];
  ui.editI = i;
  openSheet(`<h2>${esc(EX(it.ex).name)}</h2>
    <div class="row between"><span>Sets</span>${stepper("p_sets", it.sets, "")}</div>
    <div class="row between"><span>Fewest reps</span>${stepper("p_min", it.min, "")}</div>
    <div class="row between"><span>Most reps</span>${stepper("p_max", it.max, "")}</div>
    <div class="row between"><span>Rest</span>${stepper("p_rest", it.rest, "sec")}</div>
    <div class="row gap wrap"><button class="btn tonal-btn small" data-a="howto" data-ex="${it.ex}">How to</button><button class="btn tonal-btn small" data-a="planSwap">Swap exercise</button><button class="btn text small danger" data-a="planRemove">Remove</button></div>
    <button class="btn filled wide" data-a="closeSheet">Done</button>`);
}

function editSetSheet(i) {
  const it = S.cur.items[S.cur.idx], s = it.done[i];
  ui.editSet = i;
  openSheet(`<h2>Set ${i + 1}</h2>
    <div class="row between"><span>Weight</span>${stepper("es_w", s.w, "lb")}</div>
    <div class="row between"><span>Reps</span>${stepper("es_r", s.r, "")}</div>
    <div class="row gap"><button class="btn filled" data-a="closeSheet">Save</button><button class="btn text danger" data-a="delSet">Delete set</button></div>`);
}

// In-app confirm (the browser's own confirm/prompt pop-ups get blocked in some previews and webviews).
function ask(title, text, okLabel, onOk, danger = false) {
  ui.askOk = onOk;
  openSheet(`<h2>${esc(title)}</h2>${text ? `<p class="muted">${esc(text)}</p>` : ""}
    <button class="btn ${danger ? "danger-fill" : "filled"} wide" data-a="askOk">${esc(okLabel)}</button>
    <button class="btn text wide" data-a="closeSheet">Cancel</button>`);
}

// ---------------- render ----------------
function render() {
  const app = $("#app");
  const html = view === "today" ? vToday() : view === "plan" ? vPlan() : view === "progress" ? vProgress() : view === "log" ? vLog() : vSettings();
  app.innerHTML = html;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t.dataset.v === view));
  const focus = view === "today" && S.cur && !S.cur.finishing;
  $("#tabs").hidden = !S.profile || !!focus;
  document.body.classList.toggle("focus-mode", !!focus);
  tick();
}

// ---------------- rest timer, sound, wake lock ----------------
let audio = null;
function unlockAudio() {
  try {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  } catch (e) { /* no audio */ }
}
function beep() {
  if (!S.settings.sound || !audio) return;
  try {
    const t0 = audio.currentTime;
    [0, 0.28, 0.56].forEach((d, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = "sine"; o.frequency.value = i === 2 ? 1175 : 880;
      g.gain.setValueAtTime(0.0001, t0 + d); g.gain.exponentialRampToValueAtTime(0.5, t0 + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
      o.connect(g).connect(audio.destination); o.start(t0 + d); o.stop(t0 + d + 0.25);
    });
  } catch (e) { /* ignore */ }
}
function restDone() {
  beep();
  if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
  document.body.classList.remove("flash"); void document.body.offsetWidth; document.body.classList.add("flash");
}
function startRest(sec) { S.cur.restEnd = Date.now() + sec * 1000; S.cur.restTotal = sec; ui.restFired = false; }

function tick() {
  const c = S.cur;
  if (!c || !c.restEnd || view !== "today" || c.finishing) return;
  const left = Math.ceil((c.restEnd - Date.now()) / 1000);
  if (left <= -60) { c.restEnd = null; save(); render(); return; }
  const over = left <= 0;
  if (over && !ui.restFired) { ui.restFired = true; restDone(); render(); return; }
  const el = $("#bigring");
  if (!el) return;
  const frac = over ? 1 : 1 - left / (c.restTotal || 90);
  const mm = Math.floor(Math.max(0, left) / 60), ss = String(Math.max(0, left) % 60).padStart(2, "0");
  el.innerHTML = ring(frac, 230, 14, over ? "var(--warn)" : "var(--accent)", `<b class="rtime">${mm}:${ss}</b>`);
}
setInterval(tick, 250);

let wakeLockRef = null;
async function keepAwake() {
  try {
    if (S.cur && "wakeLock" in navigator && document.visibilityState === "visible" && !wakeLockRef) {
      wakeLockRef = await navigator.wakeLock.request("screen");
      wakeLockRef.addEventListener("release", () => { wakeLockRef = null; });
    }
  } catch (e) { wakeLockRef = null; }
}
function letSleep() { try { wakeLockRef?.release(); } catch (e) { /* ignore */ } wakeLockRef = null; }
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { keepAwake(); if (S.cur?.restEnd && Date.now() > S.cur.restEnd + 3000) ui.restFired = true; render(); }
});

// ---------------- actions ----------------
function curItem() { return S.cur.items[S.cur.idx]; }
function nextIndex() {
  const c = S.cur;
  for (let i = 0; i < c.items.length; i++) { const it = c.items[i]; if (i !== c.idx && !it.skipped && it.done.length < it.sets) return i; }
  return -1;
}
function advance() { const n = nextIndex(); if (n >= 0) S.cur.idx = n; }

function startWorkout(energy) {
  const day = S.plan[S.next % S.plan.length], dl = isDeload();
  const items = day.items.map((it) => {
    let sets = it.sets;
    if (dl) sets = Math.max(1, Math.ceil(sets / 2));
    else if (energy === "low") sets = Math.max(2, sets - 1);
    const sg = suggest(it);
    return { ...clone(it), sets, done: [], skipped: false, w: sg.w, r: dl ? it.min : sg.r, sg, wu: [] };
  });
  S.cur = { dayId: day.id, dayName: day.name, start: Date.now(), energy, deload: dl, items, idx: 0, restEnd: null, restTotal: 0 };
  save(); closeSheet(); keepAwake(); window.scrollTo(0, 0); render();
}

const ACT = {
  go: (d) => { if (d.v === "plan") ui.planOpen = null; view = d.v; closeSheet(); window.scrollTo(0, 0); render(); },
  closeSheet: () => { closeSheet(); render(); },
  finishSetup: () => {
    const w = num($("#setupW").value);
    if (!w || w < 70 || w > 400) return toast("Enter your weight in pounds");
    S.profile = { weight: w, since: Date.now() };
    save();
    try { navigator.storage?.persist?.(); } catch (e) { /* ignore */ }
    window.scrollTo(0, 0); render();
  },
  pickDay: (d) => { S.next = +d.i; save(); render(); toast(`${S.plan[S.next].name} is next`); },
  start: () => {
    if (isDeload()) return startWorkout("normal");
    openSheet(`<h2>How's your energy?</h2><p class="muted">Be honest. Low days still count.</p>
      <div class="energy">
        <button data-a="energy" data-e="low"><b>Low</b><span>One less set on each lift</span></button>
        <button data-a="energy" data-e="normal"><b>Normal</b><span>The full plan</span></button>
        <button data-a="energy" data-e="great"><b>Great</b><span>Full plan, go after those reps</span></button>
      </div>`);
  },
  energy: (d) => startWorkout(d.e),
  adj: (d) => {
    const dir = +d.d, k = d.k;
    const inp = document.querySelector(`[data-in="${k}"]`);
    let v = num(inp?.value);
    if (k === "w") { const it = curItem(); v = v == null ? (EX(it.ex).equip === "barbell" ? S.settings.bar : incOf(it.ex)) * (dir > 0 ? 1 : 0) : Math.max(0, v + incOf(it.ex) * dir); it.w = v; }
    else if (k === "r") { const it = curItem(); v = Math.max(0, (v ?? it.max) + dir); it.r = v; }
    else if (k === "sleepH") { v = Math.min(14, Math.max(0, (v ?? 7.5) + 0.5 * dir)); ui.sleepH = v; }
    else if (k === "es_w" || k === "es_r") { const s = curItem().done[ui.editSet]; const inc = incOf(curItem().ex); v = Math.max(0, (v ?? 0) + (k === "es_w" ? inc : 1) * dir); s[k === "es_w" ? "w" : "r"] = v; }
    else if (k.startsWith("p_")) {
      const it = S.plan[ui.planDay].items[ui.editI], f = k.slice(2);
      const stepBy = f === "rest" ? 15 : 1;
      v = Math.max(f === "rest" ? 15 : 1, (v ?? 0) + stepBy * dir);
      if (f === "sets") v = Math.min(8, v);
      it[f] = v;
      if (it.min > it.max) { if (f === "min") it.max = it.min; else it.min = it.max; }
    }
    if (inp) inp.value = v == null ? "" : r1(v);
    save();
    if (k === "w" || k.startsWith("p_") || k.startsWith("es_")) { if (k.startsWith("p_") || k.startsWith("es_")) render(); else renderKeepSheet(); }
  },
  doneSet: () => {
    unlockAudio();
    const c = S.cur, it = curItem(), e = EX(it.ex);
    const w = num(it.w), r = num(it.r);
    if (w == null) return toast("Enter the weight first");
    if (!r) return toast("Enter your reps");
    it.done.push({ w, r });
    let note = "";
    if (it.done.length < it.sets) {
      if (r >= it.max + 2 && !c.deload) { it.w = step(w, it.ex); it.bumped = true; note = e.assisted ? "Strong set! Less assist for the next one." : `Strong set! +${incOf(it.ex)} lb for the next one.`; }
      else if (r < it.min - 1) note = "That's under the range. Go a bit lighter next set.";
      startRest(it.rest);
    } else {
      const n = nextIndex();
      if (n >= 0) {
        c.idx = n; ui.howOpen = false;
        const nx = c.items[n];
        startRest(it.rest);
        note = `Next: ${EX(nx.ex).name}`;
      } else c.restEnd = null;
    }
    save(); render();
    if (note) toast(note);
  },
  skipSet: () => {
    const it = curItem();
    it.sets = Math.max(it.done.length, it.sets - 1);
    if (!pending(it)) { const n = firstPending(); if (n >= 0) S.cur.idx = n; }
    save(); render(); toast("Set skipped");
  },
  toggleHow: () => { ui.howOpen = !ui.howOpen; render(); },
  queue: () => queueSheet(),
  qSwap: (d) => { S.cur.idx = +d.i; ACT.swap(); },
  wu: (d) => { const it = curItem(); it.wu = it.wu || []; it.wu[+d.i] = !it.wu[+d.i]; save(); render(); },
  editSet: (d) => editSetSheet(+d.i),
  delSet: () => { curItem().done.splice(ui.editSet, 1); save(); closeSheet(); render(); },
  addSet: () => { curItem().sets++; save(); render(); },
  skip: () => { curItem().skipped = true; advance(); S.cur.restEnd = null; save(); render(); },
  unskip: (d) => { S.cur.items[+d.i].skipped = false; save(); render(); if ($('#sheet').classList.contains('open')) queueSheet(); },
  later: () => {
    const c = S.cur, it = curItem();
    if (nextIndex() < 0) return toast("This is the last one left");
    c.items.splice(c.idx, 1); c.items.push(it);
    c.idx = 0; const n = c.items.findIndex((x) => !x.skipped && x.done.length < x.sets); c.idx = n < 0 ? 0 : n;
    save(); render(); toast(`${EX(it.ex).name} moved to the end`);
  },
  doNow: (d) => {
    const c = S.cur, i = +d.i, it = c.items[i];
    c.items.splice(i, 1);
    const at = c.items.findIndex(pending);
    c.items.splice(at < 0 ? c.items.length : at, 0, it);
    c.idx = c.items.indexOf(it); c.restEnd = null; ui.howOpen = false;
    save(); closeSheet(); window.scrollTo(0, 0); render(); toast(`Now: ${EX(it.ex).name}`);
  },
  swap: () => {
    const it = curItem();
    pickSheet("Swap for", it.ex, (id) => {
      const c = S.cur, cur = curItem();
      const keep = document.getElementById("swapPlan")?.checked;
      if (keep) {
        const day = S.plan.find((x) => x.id === c.dayId);
        const pi = day?.items.find((x) => x.ex === cur.ex);
        if (pi) pi.ex = id;
      }
      const base = { ex: id, sets: cur.sets - cur.done.length, min: cur.min, max: cur.max, rest: cur.rest };
      const sg = suggest(base);
      const fresh = { ...base, done: [], skipped: false, w: sg.w, r: c.deload ? cur.min : sg.r, sg, wu: [] };
      if (cur.done.length) { cur.sets = cur.done.length; c.items.splice(c.idx + 1, 0, fresh); c.idx++; }
      else c.items[c.idx] = { ...fresh, sets: cur.sets };
      save(); closeSheet(); render(); toast(`Swapped to ${EX(id).name}${keep ? " (plan updated)" : ""}`);
    });
  },
  pick: (d) => { const f = ui.pick; if (f) f(d.ex); },
  howto: (d) => howtoSheet(d.ex),
  restAdd: (d) => { if (S.cur?.restEnd) { S.cur.restEnd += +d.s * 1000; S.cur.restTotal = Math.max(15, S.cur.restTotal + +d.s); save(); } },
  restSkip: () => { if (S.cur) { S.cur.restEnd = null; ui.restFired = true; save(); render(); } },
  finish: () => {
    const left = S.cur.items.filter((i) => !i.skipped && i.done.length < i.sets).length;
    const any = S.cur.items.some((i) => i.done.length);
    const wrap = () => { closeSheet(); S.cur.finishing = true; S.cur.restEnd = null; ui.rating = null; save(); window.scrollTo(0, 0); render(); };
    if (!any) return ask("Cancel this workout?", "Nothing's logged yet, so nothing will be saved.", "Cancel workout", () => { closeSheet(); S.cur = null; save(); letSleep(); render(); }, true);
    if (!left) return wrap();
    ui.endWrap = wrap;
    openSheet(`<h2>End the workout?</h2><p class="muted">${left} lift${left > 1 ? "s" : ""} not finished yet. Everything you've done so far is kept.</p>
      <button class="btn filled wide" data-a="endWrap">Finish and save</button>
      <button class="btn tonal-btn wide" data-a="closeSheet">Keep going</button>
      <button class="btn text wide danger" data-a="discard">Discard workout</button>`);
  },
  backToWorkout: () => { S.cur.finishing = false; save(); render(); },
  discard: () => ask("Discard this workout?", "None of it will be saved.", "Discard", () => { closeSheet(); S.cur = null; save(); letSleep(); view = "today"; render(); }, true),
  endWrap: () => ui.endWrap?.(),
  askOk: () => { const f = ui.askOk; ui.askOk = null; f?.(); },
  rate: (d) => { ui.rating = +d.r; render(); },
  saveWorkout: () => {
    if (!ui.rating) return toast("Tap a number for how hard it felt");
    const c = S.cur;
    const st = sessionStats(c);
    S.workouts.push({
      id: Date.now(), dayId: c.dayId, dayName: c.dayName, start: c.start, end: Date.now(), energy: c.energy, deload: c.deload, rating: ui.rating,
      items: c.items.filter((i) => i.done.length).map((i) => ({ ex: i.ex, min: i.min, max: i.max, sets: i.done })),
    });
    const di = S.plan.findIndex((d) => d.id === c.dayId);
    if (di >= 0) S.next = (di + 1) % S.plan.length;
    if (!S.cycleStart) S.cycleStart = weekStart();
    S.cur = null; save(); letSleep(); render();
    toast(st.prs.length ? `Saved. ${st.prs.length} new best${st.prs.length > 1 ? "s" : ""}!` : "Saved. See you next time!");
  },
  skipSleep: () => { S.sleepAsked = ymd(); save(); render(); },
  sleepQ: (d) => { ui.sleepQ = d.q; render(); },
  saveSleep: () => {
    const h = num(document.querySelector('[data-in="sleepH"]')?.value) ?? ui.sleepH ?? 7.5;
    S.sleep[ymd()] = { h, q: ui.sleepQ || "Okay" };
    S.sleepAsked = ymd(); ui.sleepH = null; ui.sleepQ = null; save(); render(); toast("Sleep saved");
  },
  redoSleep: () => { const s = S.sleep[ymd()]; ui.sleepH = s?.h; ui.sleepQ = s?.q; delete S.sleep[ymd()]; save(); render(); },
  addP: (d) => { (S.protein[ymd()] ||= []).push({ g: +d.g, label: d.l, t: Date.now() }); save(); render(); toast(`+${d.g} g protein`); },
  customP: () => {
    openSheet(`<h2>Add protein</h2><p class="muted">Check the label for grams of protein.</p>
      <div class="row"><input id="customG" class="big-in" inputmode="numeric" placeholder="e.g. 30"><span class="unit">g</span></div>
      <button class="btn filled wide" data-a="saveCustomP">Add</button>`);
    setTimeout(() => $("#customG")?.focus(), 250);
  },
  saveCustomP: () => {
    const v = num($("#customG")?.value);
    if (!v || v <= 0 || v > 200) return toast("Enter grams between 1 and 200");
    (S.protein[ymd()] ||= []).push({ g: Math.round(v), label: "Other", t: Date.now() }); save(); closeSheet(); render(); toast(`+${Math.round(v)} g protein`);
  },
  delP: (d) => { S.protein[ymd()].splice(+d.i, 1); save(); render(); },
  openWorkout: (d) => { ui.openWorkout = ui.openWorkout === +d.id ? null : +d.id; render(); },
  delWorkout: (d) => {
    ask("Delete this workout?", "It's removed for good, along with its sets.", "Delete", () => { S.workouts = S.workouts.filter((w) => w.id !== +d.id); save(); closeSheet(); render(); }, true);
  },
  openDay: (d) => { ui.planOpen = +d.i; ui.planDay = +d.i; window.scrollTo(0, 0); render(); },
  closeDay: () => { ui.planOpen = null; render(); },
  startDay: (d) => { S.next = +d.i; save(); ACT.start(); },
  previewDay: (d) => { const day = S.plan[+d.i]; openSheet(`<h2>${esc(day.name)}</h2><p class="muted">${esc(focusOf(day))} · ~${minutesOf(day)} min</p><ul class="plain">${day.items.map((it) => `<li><span>${esc(EX(it.ex).name)}</span><span class="muted">${it.sets} × ${it.min}–${it.max}</span></li>`).join("")}</ul><button class="btn filled wide" data-a="start">Start ${esc(day.name)}</button>`); },
  mv: (d) => {
    const items = S.plan[ui.planDay].items, i = +d.i, j = i + +d.d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]]; save(); render();
  },
  editItem: (d) => itemSheet(+d.i),
  planSwap: () => {
    const it = S.plan[ui.planDay].items[ui.editI];
    pickSheet("Swap for", it.ex, (id) => { it.ex = id; save(); closeSheet(); render(); toast(`Swapped to ${EX(id).name}`); });
  },
  planRemove: () => { S.plan[ui.planDay].items.splice(ui.editI, 1); save(); closeSheet(); render(); },
  addEx: () => pickSheet("Add an exercise", null, (id) => {
    const e = EX(id), small = Object.values(e.muscles).length === 1;
    S.plan[ui.planDay].items.push({ ex: id, sets: 3, min: small ? 10 : 8, max: small ? 15 : 12, rest: small ? 75 : 120 });
    save(); closeSheet(); render(); toast(`Added ${e.name}`);
  }),
  resetDay: () => {
    const d = S.plan[ui.planDay], orig = BM_DAYS.find((x) => x.id === d.id);
    if (orig) ask(`Reset ${d.name}?`, "It goes back to the original lifts, order, sets and reps.", "Reset", () => { S.plan[ui.planDay] = clone(orig); save(); closeSheet(); render(); }, true);
  },
  chartEx: (d) => { ui.chartEx = d.ex; render(); },
  inc: (d) => { S.settings.inc[d.k] = +d.v; save(); render(); },
  bar: (d) => { S.settings.bar = +d.v; save(); render(); },
  sound: () => { S.settings.sound = !S.settings.sound; unlockAudio(); save(); render(); if (S.settings.sound) beep(); },
  deloadNow: () => { S.cycleStart = weekStart() - 5 * 7 * DAY; save(); render(); toast("This week is a lighter week"); },
  skipDeload: () => { S.cycleStart = weekStart(); save(); render(); toast("Back to week 1"); },
  export: async () => {
    const blob = new Blob([JSON.stringify(S)], { type: "application/json" });
    const name = `bigmike-backup-${ymd()}.json`;
    try {
      const file = new File([blob], name, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "BigMike backup" });
      } else {
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      }
      S.lastBackup = Date.now(); save(); render(); toast("Backup saved");
    } catch (e) { if (e?.name !== "AbortError") toast("Couldn't save the backup"); }
  },
  wipe: () => {
    ask("Erase everything?", "All workouts, logs and settings on this phone. This can't be undone.", "Erase everything", () => { S = fresh(); save(); closeSheet(); view = "today"; render(); }, true);
  },
};

function renderKeepSheet() {
  // Re-render the page behind an open sheet without closing it.
  const sheet = $("#sheet").classList.contains("open");
  if (!sheet) render();
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el || el.disabled) return;
  const f = ACT[el.dataset.a];
  if (f) { e.preventDefault(); f(el.dataset, el); }
});
document.addEventListener("pointerdown", unlockAudio, { once: true });

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "importFile" && t.files?.[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (!d || !d.v || !Array.isArray(d.workouts)) throw new Error("bad");
        ask("Restore this backup?", `It has ${d.workouts.length} workouts and replaces what's on this phone.`, "Restore", () => { S = Object.assign(fresh(), d); save(); closeSheet(); view = "today"; render(); toast("Backup restored"); });
      } catch (err) { toast("That file isn't a BigMike backup"); }
    };
    fr.readAsText(t.files[0]);
    return;
  }
  const k = t.dataset?.in;
  if (!k) return;
  const v = num(t.value);
  if (k === "w" && S.cur) curItem().w = v;
  else if (k === "r" && S.cur) curItem().r = v;
  else if (k === "sleepH") ui.sleepH = v;
  else if (k === "bw") { if (v && v > 50) { S.profile.weight = v; toast("Saved"); } }
  else if (k === "es_w" || k === "es_r") { if (v != null) curItem().done[ui.editSet][k === "es_w" ? "w" : "r"] = v; }
  else if (k.startsWith("p_") && v) {
    const it = S.plan[ui.planDay].items[ui.editI], f = k.slice(2);
    it[f] = Math.round(v);
    if (it.min > it.max) it.max = it.min;
  }
  save();
});
// Keep typed weights and reps as you type, so nothing is lost if you tap Done straight away.
document.addEventListener("input", (e) => {
  const k = e.target.dataset?.in;
  if (!S.cur || (k !== "w" && k !== "r")) return;
  curItem()[k] = num(e.target.value);
});
document.addEventListener("focusin", (e) => { if (e.target.matches("input[inputmode]")) setTimeout(() => e.target.select?.(), 0); });

// ---------------- drag to reorder (plan day) ----------------
let drag = null;
document.addEventListener("pointerdown", (e) => {
  const h = e.target.closest(".handle");
  if (!h) return;
  const li = h.closest("li"), ul = li.parentElement;
  e.preventDefault();
  h.setPointerCapture?.(e.pointerId);
  const items = [...ul.children];
  drag = { li, ul, items, from: items.indexOf(li), to: items.indexOf(li), y0: e.clientY, hgt: li.getBoundingClientRect().height };
  li.classList.add("dragging");
});
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  e.preventDefault();
  const dy = e.clientY - drag.y0;
  drag.li.style.transform = `translateY(${dy}px)`;
  const to = Math.max(0, Math.min(drag.items.length - 1, drag.from + Math.round(dy / drag.hgt)));
  drag.to = to;
  drag.items.forEach((el, i) => {
    if (el === drag.li) return;
    const shift = drag.from < to && i > drag.from && i <= to ? -drag.hgt : to < drag.from && i >= to && i < drag.from ? drag.hgt : 0;
    el.style.transform = shift ? `translateY(${shift}px)` : "";
  });
}, { passive: false });
function endDrag() {
  if (!drag) return;
  const { from, to, ul } = drag;
  drag = null;
  if (ul.id === "queueList") {
    const c = S.cur;
    const pend = c.items.filter(pending), gone = c.items.filter((x) => !pending(x));
    if (from !== to) { const [m] = pend.splice(from, 1); pend.splice(to, 0, m); }
    c.items = gone.concat(pend);
    c.idx = c.items.findIndex(pending);
    save(); render(); queueSheet();
    return;
  }
  if (from !== to) {
    const items = S.plan[ui.planDay].items;
    const [m] = items.splice(from, 1);
    items.splice(to, 0, m);
    save();
  }
  render();
}
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);

// ---------------- start ----------------
if (S.cur?.restEnd && Date.now() > S.cur.restEnd) ui.restFired = true;
if (S.cur) keepAwake();
render();
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
