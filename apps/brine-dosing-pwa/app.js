// محاسبه‌گر دوز کاستیک و کربنات سدیم برای اکسس تانک رسوب‌دهی آب‌نمک
// اعداد پایه از Operating Manual C/A Plant (Doc 8408205-CB-PR-MNL-0102)

const MW = {
  NA2CO3: 105.99,
  CA: 40.08,
  NAOH: 40.00,
  MG: 24.305,
};

const RATIO_NA2CO3_PER_CA = MW.NA2CO3 / MW.CA;     // ~2.644  (1 mol Na2CO3 : 1 mol Ca2+)
const RATIO_NAOH_PER_MG = (2 * MW.NAOH) / MW.MG;   // ~3.292  (2 mol NaOH : 1 mol Mg2+)

const DOWNSTREAM_LIMIT_NA2CO3 = 400; // mg/l  (Table 6-8: <0.4 g/l)
const DOWNSTREAM_LIMIT_NAOH   = 200; // mg/l  (Table 6-8: <0.2 g/l)

const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  qDesign: 500, trains: "1", loadPct: 100,
  excNa: 400, excOH: 150,
  concNa: 10, densNa: 1.105,
  concOH: 18, densOH: 1.197,
  purity: 99,
  advToggle: false, caPpm: 0, mgPpm: 0,
};

function fmt(n, d = 1) {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function setNotice(el, type, html) {
  if (!html) { el.innerHTML = ""; return; }
  el.innerHTML = `<div class="notice ${type}">${html}</div>`;
}

function readInputs() {
  return {
    qDesign: parseFloat($("qDesign").value) || 0,
    trains: parseInt($("trains").value, 10) || 1,
    loadPct: parseFloat($("loadPct").value) || 0,
    excNa: parseFloat($("excNa").value) || 0,
    excOH: parseFloat($("excOH").value) || 0,
    concNa: parseFloat($("concNa").value) || 0,
    densNa: parseFloat($("densNa").value) || 0,
    concOH: parseFloat($("concOH").value) || 0,
    densOH: parseFloat($("densOH").value) || 0,
    purity: parseFloat($("purity").value) || 0,
    advToggle: $("advToggle").checked,
    caPpm: parseFloat($("caPpm").value) || 0,
    mgPpm: parseFloat($("mgPpm").value) || 0,
  };
}

function calculate() {
  const v = readInputs();

  $("loadPctVal").textContent = v.loadPct + "٪";
  $("advBody").classList.toggle("open", v.advToggle);

  const Q = v.qDesign * v.trains * (v.loadPct / 100); // m3/h total

  // stoichiometric addition (optional, advanced mode)
  const stoichNa = v.advToggle ? v.caPpm * RATIO_NA2CO3_PER_CA : 0;
  const stoichOH = v.advToggle ? v.mgPpm * RATIO_NAOH_PER_MG : 0;

  const totalConcNa = v.excNa + stoichNa; // mg/l = g/m3
  const totalConcOH = v.excOH + stoichOH;

  // pure chemical mass flow: kg/h = Q(m3/h) * C(g/m3) / 1000
  const naKgH = Q * totalConcNa / 1000;
  const ohKgH = Q * totalConcOH / 1000;
  const naKgDay = naKgH * 24;
  const ohKgDay = ohKgH * 24;

  // solution volumetric flow: L/h = kg_pure/h / (density(kg/L) * fraction)
  const naFrac = v.concNa / 100;
  const ohFrac = v.concOH / 100;
  const naSolLh = (naFrac > 0 && v.densNa > 0) ? naKgH / (naFrac * v.densNa) : NaN;
  const ohSolLh = (ohFrac > 0 && v.densOH > 0) ? ohKgH / (ohFrac * v.densOH) : NaN;
  const ohSolM3Day = ohSolLh * 24 / 1000;

  // dry 50kg bags/day for Na2CO3 (as received in bags, per doc)
  const naBags = (v.purity > 0) ? naKgDay / (50 * (v.purity / 100)) : NaN;

  // --- render ---
  $("qActual").textContent = fmt(Q, 1);

  $("naKgH").textContent = fmt(naKgH, 1);
  $("naKgDay").textContent = fmt(naKgDay, 0);
  $("naSolLh").textContent = fmt(naSolLh, 0);
  $("naBags").textContent = fmt(naBags, 1);

  $("ohKgH").textContent = fmt(ohKgH, 1);
  $("ohKgDay").textContent = fmt(ohKgDay, 0);
  $("ohSolLh").textContent = fmt(ohSolLh, 0);
  $("ohSolM3Day").textContent = fmt(ohSolM3Day, 2);

  // breakdown text
  if (v.advToggle && (v.caPpm > 0 || v.mgPpm > 0)) {
    $("naBreak").innerHTML =
      `غلظت هدف کل: <b>${fmt(totalConcNa,0)} mg/l</b> = اکسس <b>${fmt(v.excNa,0)}</b> + استوکیومتری Ca²⁺ <b>${fmt(stoichNa,0)}</b> mg/l (نسبت مولی Na₂CO₃:Ca²⁺ = ${fmt(RATIO_NA2CO3_PER_CA,3)})`;
    $("ohBreak").innerHTML =
      `غلظت هدف کل: <b>${fmt(totalConcOH,0)} mg/l</b> = اکسس <b>${fmt(v.excOH,0)}</b> + استوکیومتری Mg²⁺ <b>${fmt(stoichOH,0)}</b> mg/l (نسبت مولی NaOH:Mg²⁺ = ${fmt(RATIO_NAOH_PER_MG,3)})`;
  } else {
    $("naBreak").innerHTML = `غلظت هدف: اکسس <b>${fmt(v.excNa,0)} mg/l</b> (بدون احتساب سختی آب‌نمک — حالت پیشرفته غیرفعال است)`;
    $("ohBreak").innerHTML = `غلظت هدف: اکسس <b>${fmt(v.excOH,0)} mg/l</b> (بدون احتساب سختی آب‌نمک — حالت پیشرفته غیرفعال است)`;
  }

  // warnings vs downstream limits (Table 6-8)
  if (v.excNa > DOWNSTREAM_LIMIT_NA2CO3) {
    setNotice($("naNotice"), "danger",
      `⚠ اکسس هدف (${fmt(v.excNa,0)} mg/l) از حد مجاز پایین‌دست آب‌نمک فوق‌خالص (&lt; ${DOWNSTREAM_LIMIT_NA2CO3} mg/l) بیشتر است؛ ممکن است CO₂ در کلر افزایش یابد.`);
  } else {
    setNotice($("naNotice"), "ok", `✓ در محدوده مجاز نسبت به حد پایین‌دست (&lt; ${DOWNSTREAM_LIMIT_NA2CO3} mg/l)`);
  }

  if (v.excOH > DOWNSTREAM_LIMIT_NAOH) {
    setNotice($("ohNotice"), "danger",
      `⚠ اکسس هدف (${fmt(v.excOH,0)} mg/l) از حد مجاز پایین‌دست آب‌نمک فوق‌خالص (&lt; ${DOWNSTREAM_LIMIT_NAOH} mg/l) بیشتر است؛ ممکن است O₂ در کلر افزایش یابد.`);
  } else {
    setNotice($("ohNotice"), "ok", `✓ در محدوده مجاز نسبت به حد پایین‌دست (&lt; ${DOWNSTREAM_LIMIT_NAOH} mg/l)`);
  }

  // excess field-level warning box
  if (v.excNa > DOWNSTREAM_LIMIT_NA2CO3 || v.excOH > DOWNSTREAM_LIMIT_NAOH) {
    $("excWarn").innerHTML = `<div class="notice warn">مقدار وارد شده بالاتر از مقدار مرجع سند (۴۰۰/۱۵۰ mg/l) است. طبق جدول حداکثر ناخالصی مجاز آب‌نمک فوق‌خالص، سقف قابل قبول Na₂CO₃ &lt; ۴۰۰ mg/l و NaOH &lt; ۲۰۰ mg/l است.</div>`;
  } else {
    $("excWarn").innerHTML = "";
  }
}

function applyDefaults() {
  $("qDesign").value = DEFAULTS.qDesign;
  $("trains").value = DEFAULTS.trains;
  $("loadPct").value = DEFAULTS.loadPct;
  $("excNa").value = DEFAULTS.excNa;
  $("excOH").value = DEFAULTS.excOH;
  $("concNa").value = DEFAULTS.concNa;
  $("densNa").value = DEFAULTS.densNa;
  $("concOH").value = DEFAULTS.concOH;
  $("densOH").value = DEFAULTS.densOH;
  $("purity").value = DEFAULTS.purity;
  $("advToggle").checked = DEFAULTS.advToggle;
  $("caPpm").value = DEFAULTS.caPpm;
  $("mgPpm").value = DEFAULTS.mgPpm;
  calculate();
}

document.addEventListener("DOMContentLoaded", () => {
  const ids = ["qDesign","trains","loadPct","excNa","excOH","concNa","densNa",
               "concOH","densOH","purity","advToggle","caPpm","mgPpm"];
  ids.forEach((id) => {
    const el = $(id);
    el.addEventListener("input", calculate);
    el.addEventListener("change", calculate);
  });
  $("resetBtn").addEventListener("click", applyDefaults);
  calculate();

  // PWA install prompt
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("installBar").classList.add("show");
  });
  $("installBtn").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    $("installBar").classList.remove("show");
  });
  window.addEventListener("appinstalled", () => {
    $("installBar").classList.remove("show");
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
});
