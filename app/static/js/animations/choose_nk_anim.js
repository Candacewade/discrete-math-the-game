// app/static/js/animations/choose_nk_anim.js
// Combinations-only visualization: "duplicate collapse" to show order doesn't matter.

(() => {
  if (!window.gsap) {
    console.warn("[choose_nk_anim] GSAP not found. Include it before this script.");
    return;
  }

  gsap.defaults({ ease: "power3.out" });

  const $ = (id) => document.getElementById(id);

  // ---------- math ----------
  function nCk(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let num = 1;
    let den = 1;
    for (let i = 1; i <= k; i++) {
      num *= (n - (k - i));
      den *= i;
    }
    return Math.round(num / den);
  }

  // ---------- DOM helpers ----------
  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function clampInt(x, lo, hi, fallback) {
    const n = Number(x);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(lo, Math.min(hi, Math.trunc(n)));
  }

  // Create a circular dot for the pool
  function makePoolDot(letter, color) {
    const d = document.createElement("div");
    d.className = "pdot pool-dot";
    d.dataset.letter = letter;
    d.dataset.color = color;
    d.style.background = color;
    d.textContent = letter;
    return d;
  }

  // Create a chip in rows
  function makeChip(letter, color) {
    const c = document.createElement("div");
    c.className = "chip";
    c.dataset.letter = letter;
    c.dataset.color = color;
    c.style.background = color;
    c.textContent = letter;
    return c;
  }

  function findVizPayload(root = document) {
    // IMPORTANT: this payload lives in choose_problem_block.html,
    // which gets swapped into #choose-problem-area via HTMX.
    return root.querySelector('[data-viz="choose"]');
  }

  // Fly animation: clone element at screen coords, animate to target, then "materialize" chip.
  function flyClone(fromEl, toEl, onDone) {
    const a = fromEl.getBoundingClientRect();
    const b = toEl.getBoundingClientRect();

    const clone = fromEl.cloneNode(true);
    clone.style.position = "fixed";
    clone.style.left = `${a.left}px`;
    clone.style.top = `${a.top}px`;
    clone.style.margin = "0";
    clone.style.zIndex = "9999";
    clone.style.pointerEvents = "none";
    clone.style.transformOrigin = "center";
    document.body.appendChild(clone);

    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const dy = (b.top + b.height / 2) - (a.top + a.height / 2);

    gsap.to(clone, {
      x: dx,
      y: dy,
      duration: 0.42,
      onComplete: () => {
        clone.remove();
        if (onDone) onDone();
      },
    });
  }

  // ---------- main state ----------
  const LETTERS = "ABCDEFGHIJ".split("");
  const COLORS = [
  "#FF6B6B", "#FF922B", "#FFD43B", "#69DB7C", "#38D9A9",
  "#4DABF7", "#748FFC", "#B197FC", "#F06595", "#ea30dbff",
];


  let stepIndex = 0;

  function combFormulaText(n, k) {
  return `Combinations: C(${n}, ${k}) aka ${n}! / ${k}!(${n}-${k})!`;
}


  // ---------- rendering ----------
  function renderFromPayload(payload) {
    // Required DOM pieces from lesson_choose_nk.html
    const scenarioTitle = $("scenarioTitle");
    const scenarioPrompt = $("scenarioPrompt");
    const pool = $("pool");
    const seqRow1 = $("seqRow1");
    const seqRow2 = $("seqRow2");
    const setRow = $("setRow");
    const rowLabel2 = $("rowLabel2");
    const rowLabelSet = $("rowLabelSet");
    const eqText = $("eqText");

    if (!pool || !seqRow1 || !seqRow2 || !setRow) {
      console.warn("[choose_nk_anim] Missing expected DOM IDs. Check your lesson template.");
      return null;
    }

    // Parse payload
    const title = payload?.dataset?.title || "Choose k from n";
    const prompt = payload?.dataset?.prompt || "";
    const n = clampInt(payload?.dataset?.n, 1, 10, 9);
    const kRaw = clampInt(payload?.dataset?.k, 1, 10, 3);
    const k = Math.min(kRaw, n);

    if (scenarioTitle) scenarioTitle.textContent = title;
    if (scenarioPrompt) scenarioPrompt.textContent = prompt || `Choose ${k} from ${n}.`;

    // Reset visual rows
    clear(seqRow1);
    clear(seqRow2);
    clear(setRow);

    // Reset label vis
    if (rowLabel2) rowLabel2.style.opacity = "0";
    if (seqRow2) seqRow2.style.opacity = "0";
    if (rowLabelSet) rowLabelSet.style.opacity = "0";
    if (setRow) setRow.style.opacity = "0";

    // Reset equation
    if (eqText) eqText.textContent = `C(${n}, ${k}) = ?`;

    // Build pool
    clear(pool);
    for (let i = 0; i < n; i++) {
      pool.appendChild(makePoolDot(LETTERS[i], COLORS[i % COLORS.length]));
    }

    // Reset step counter whenever new problem loads
    stepIndex = 0;

    return { n, k };
  }

  function currentNK() {
    const payload = findVizPayload(document);
    if (!payload) return { n: 9, k: 3 };
    const n = clampInt(payload.dataset.n, 1, 10, 9);
    const k = Math.min(clampInt(payload.dataset.k, 1, 10, 3), n);
    return { n, k };
  }

  // ---------- animation steps ----------
  function step1_fillSequence1(n, k) {
    const pool = $("pool");
    const seqRow1 = $("seqRow1");
    const eqText = $("eqText");

    const poolDots = Array.from(pool.querySelectorAll(".pool-dot"));
    const picks = poolDots.slice(0, k);

    clear(seqRow1);

    const tl = gsap.timeline();
    picks.forEach((src, idx) => {
      // placeholder target
      const target = document.createElement("div");
      target.className = "chip";
      target.style.opacity = "0";
      seqRow1.appendChild(target);

      tl.add(() => {
        flyClone(src, target, () => {
          // materialize chip
          const chip = makeChip(src.dataset.letter, src.dataset.color);
          target.replaceWith(chip);
          gsap.fromTo(chip, { scale: 0.7 }, { scale: 1, duration: 0.18 });
        });
      }, idx * 0.08);
    });

    tl.add(() => {
      if (eqText) eqText.textContent = "Sequence 1 looks ordered…";
    }, "+=0.12");

    return picks;
  }

  function step2_sequence2_reorder(picks) {
    const seqRow2 = $("seqRow2");
    const rowLabel2 = $("rowLabel2");
    const eqText = $("eqText");

    clear(seqRow2);
    if (rowLabel2) gsap.to(rowLabel2, { opacity: 1, duration: 0.2 });
    gsap.to(seqRow2, { opacity: 1, duration: 0.2 });

    // reorder = swap first two (if possible)
    const order2 = picks.slice();
    if (order2.length >= 2) {
      const tmp = order2[0];
      order2[0] = order2[1];
      order2[1] = tmp;
    }

    const tl = gsap.timeline();
    order2.forEach((src, idx) => {
      const target = document.createElement("div");
      target.className = "chip";
      target.style.opacity = "0";
      seqRow2.appendChild(target);

      tl.add(() => {
        flyClone(src, target, () => {
          const chip = makeChip(src.dataset.letter, src.dataset.color);
          target.replaceWith(chip);
          gsap.fromTo(chip, { scale: 0.7 }, { scale: 1, duration: 0.18 });
        });
      }, idx * 0.08);
    });

    tl.add(() => {
      if (eqText) eqText.textContent = "…but it’s the same chosen set.";
    }, "+=0.12");
  }

  function step3_merge_to_set(picks, n, k) {
    const seqRow1 = $("seqRow1");
    const seqRow2 = $("seqRow2");
    const setRow = $("setRow");
    const rowLabelSet = $("rowLabelSet");
    const eqText = $("eqText");

    clear(setRow);
    if (rowLabelSet) gsap.to(rowLabelSet, { opacity: 1, duration: 0.2 });
    gsap.to(setRow, { opacity: 1, duration: 0.2 });

    // canonical "set" order: alphabetical by letter
    const sorted = picks.slice().sort((a, b) => a.dataset.letter.localeCompare(b.dataset.letter));

    const tl = gsap.timeline();

    sorted.forEach((src, idx) => {
      const target = document.createElement("div");
      target.className = "chip";
      target.style.opacity = "0";
      setRow.appendChild(target);

      tl.add(() => {
        flyClone(src, target, () => {
          const chip = makeChip(src.dataset.letter, src.dataset.color);
          target.replaceWith(chip);
          gsap.fromTo(chip, { scale: 0.7 }, { scale: 1, duration: 0.18 });
        });
      }, idx * 0.08);
    });

    tl.to([seqRow1, seqRow2], { opacity: 0.25, duration: 0.25 }, "-=0.05");

    tl.add(() => {
      const val = nCk(n, k);
      eqText.textContent = combFormulaText(n, k);
      gsap.fromTo(setRow, { scale: 1 }, { scale: 1.03, yoyo: true, repeat: 1, duration: 0.14 });
    }, "+=0.10");
  }

  // ---------- controller ----------
  let cachedPicks = null;

  function onNext() {
    const payload = findVizPayload(document);
    if (!payload) {
      // If no problem yet, still show a default pool
      const nk = currentNK();
      if (!$("pool")?.children?.length) {
        renderFromPayload({ dataset: { title: "Choose k from n", prompt: "Click “New problem” to load.", n: nk.n, k: nk.k } });
      }
      return;
    }

    const { n, k } = currentNK();

    if (stepIndex === 0) {
      // Ensure current problem is rendered first
      renderFromPayload(payload);
      // Now animate
      cachedPicks = step1_fillSequence1(n, k);
      stepIndex = 1;
      return;
    }

    if (stepIndex === 1) {
      if (!cachedPicks) {
        cachedPicks = Array.from($("pool").querySelectorAll(".pool-dot")).slice(0, k);
      }
      step2_sequence2_reorder(cachedPicks);
      stepIndex = 2;
      return;
    }

    if (stepIndex === 2) {
      if (!cachedPicks) {
        cachedPicks = Array.from($("pool").querySelectorAll(".pool-dot")).slice(0, k);
      }
      step3_merge_to_set(cachedPicks, n, k);
      stepIndex = 3;
      return;
    }

    // stepIndex >= 3: reset for replay
    const seqRow1 = $("seqRow1");
    const seqRow2 = $("seqRow2");
    if (seqRow1) seqRow1.style.opacity = "1";
    if (seqRow2) seqRow2.style.opacity = "1";
    cachedPicks = null;
    stepIndex = 0;

    renderFromPayload(payload);
  }

  function syncFromSwap(root) {
    const payload = findVizPayload(root);
    if (!payload) return;

    // Render immediately so user sees the pool change after New problem
    renderFromPayload(payload);

    // Reset so Next starts at step 1 animation
    cachedPicks = null;
    stepIndex = 0;
  }

  function init() {
    const nextBtn = $("nextBtn");
    if (!nextBtn) {
      console.warn("[choose_nk_anim] nextBtn not found.");
      return;
    }

    // Initial render (if there is already a problem on page load)
    const payload = findVizPayload(document);
    if (payload) {
      renderFromPayload(payload);
    } else {
      // default pool so page isn't blank
      const nk = currentNK();
      renderFromPayload({ dataset: { title: "Combinations", prompt: "Click “New problem” to start.", n: nk.n, k: nk.k } });
    }

    nextBtn.addEventListener("click", onNext);

    // Re-sync after HTMX swaps new problem block in
    document.body.addEventListener("htmx:afterSwap", (evt) => {
      if (evt.target && evt.target.id === "choose-problem-area") {
        syncFromSwap(evt.target);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
