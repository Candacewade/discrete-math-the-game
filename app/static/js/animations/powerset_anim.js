// /static/js/animations/powerset_anim.js
// Powerset viz: shows items, cycles subsets, reveals ALL subsets grid (n <= 6).
// Requires these IDs in lesson_powerset.html:
// psInstr, psNextBtn, psPool, psSubsetBox, psSubset, psSubsetEmpty, psAllMount, psEq
// Reads data from: <div data-viz="powerset" data-items="a||b||c" data-n="3" data-prompt="..."></div>

(function () {
  const COLORS = [
    "#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93",
    "#f72585", "#4cc9f0", "#ffd166", "#06d6a0", "#118ab2"
  ];

  function $(id) { return document.getElementById(id); }

  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function splitItems(raw) {
    if (!raw) return [];
    return String(raw)
      .split("||")
      .map(s => s.trim())
      .filter(Boolean);
  }

  function letters(n) {
    const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const out = [];
    for (let i = 0; i < n; i++) out.push(A[i % A.length]);
    return out;
  }

  // IMPORTANT: always search from document as a fallback (HTMX swaps can confuse root-scoped queries)
  function getVizNode(root = document) {
    return (root && root.querySelector && root.querySelector('[data-viz="powerset"]'))
      || document.querySelector('[data-viz="powerset"]');
  }

  function getData(root = document) {
    const el = getVizNode(root);
    if (!el) return null;

    const items = splitItems(el.dataset.items);
    const nRaw = Number(el.dataset.n || items.length || 0);
    const n = Math.max(0, Math.min(10, isNaN(nRaw) ? 0 : nRaw));

    const finalItems = items.length ? items : letters(n);

    return {
      title: el.dataset.title || "Powersets",
      prompt: el.dataset.prompt || "",
      n: finalItems.length,
      items: finalItems
    };
  }

  function setPowersetTopQuestion(prompt) {
    const top = $("powersetTopQuestion");
    if (!top) return;

    if (prompt) {
      top.classList.remove("start-hint");
      top.textContent = prompt;
    } else {
      top.classList.add("start-hint");
      top.textContent = 'Click “New problem” to start, then hit next to visualize the problem.';
    }
  }

  // ---- All subsets mounting (ALWAYS goes under #psAllMount) ----
  function ensureAllSubsetsContainer() {
    let wrap = $("psAllWrap");
    if (wrap) return wrap;

    const mount = $("psAllMount");
    if (!mount) return null;

    wrap = document.createElement("div");
    wrap.id = "psAllWrap";
    wrap.style.marginTop = "14px";

    const label = document.createElement("div");
    label.className = "ps-label";
    label.textContent = "All subsets";
    label.style.marginBottom = "8px";

    const grid = document.createElement("div");
    grid.id = "psAllSubsets";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(140px, 1fr))";
    grid.style.gap = "10px";

    wrap.appendChild(label);
    wrap.appendChild(grid);

    mount.innerHTML = "";
    mount.appendChild(wrap);

    return wrap;
  }

  function makePoolItem(name, idx) {
    const item = document.createElement("div");
    item.className = "ps-item";

    const dot = document.createElement("div");
    dot.className = "ps-dot";
    dot.textContent = String.fromCharCode(65 + (idx % 26));
    dot.style.background = COLORS[idx % COLORS.length];

    const label = document.createElement("div");
    label.className = "ps-name";
    label.textContent = name;

    item.appendChild(dot);
    item.appendChild(label);
    return item;
  }

  function makeSubsetChip(name, idx) {
    const chip = document.createElement("div");
    chip.className = "ps-pill";
    chip.textContent = name;
    chip.style.borderColor = COLORS[idx % COLORS.length];
    chip.style.background = "rgba(0,0,0,0.02)";
    return chip;
  }

  function subsetToList(items, mask) {
    const chosen = [];
    for (let i = 0; i < items.length; i++) {
      if (mask & (1 << i)) chosen.push({ name: items[i], idx: i });
    }
    return chosen;
  }

  function buildAllSubsetsGrid(items, currentMask, limit) {
    const grid = $("psAllSubsets");
    if (!grid) return;

    clear(grid);

    const total = 1 << items.length;
    const showCount = Math.min(total, limit);

    for (let mask = 0; mask < showCount; mask++) {
      const card = document.createElement("div");
      card.className = "ps-subcard";
      card.dataset.mask = String(mask);

      const chosen = subsetToList(items, mask);
      card.textContent = chosen.length ? chosen.map(x => x.name).join(", ") : "∅ (empty set)";

      if (mask === currentMask) card.classList.add("active");
      grid.appendChild(card);
    }

    if (total > showCount) {
      const note = document.createElement("div");
      note.className = "muted";
      note.style.gridColumn = "1 / -1";
      note.style.paddingTop = "6px";
      note.textContent = `Showing first ${showCount} of ${total} subsets (n is large).`;
      grid.appendChild(note);
    }
  }

  function highlightActiveCard(mask) {
    const grid = $("psAllSubsets");
    if (!grid) return;
    grid.querySelectorAll(".ps-subcard.active").forEach(c => c.classList.remove("active"));
    const card = grid.querySelector(`.ps-subcard[data-mask="${mask}"]`);
    if (card) card.classList.add("active");
  }

  let state = {
    items: [],
    mask: 0,
    revealedGrid: false
  };

  function renderInitial(data) {
    const pool = $("psPool");
    const subset = $("psSubset");
    const empty = $("psSubsetEmpty");
    const eq = $("psEq");
    const instr = $("psInstr");

    if (!pool || !subset) return;

    clear(pool);
    clear(subset);

    state.items = data.items.slice();
    state.mask = 0;
    state.revealedGrid = false;

    setPowersetTopQuestion(data.prompt);

    // pool dots
    data.items.forEach((name, i) => pool.appendChild(makePoolItem(name, i)));

    // empty set initially
    if (empty) empty.style.display = "block";
    if (instr) instr.textContent = "Click Next to cycle through subsets (and reveal all subsets).";
    if (eq) eq.textContent = "Total subsets = 2^n";

    // create + build full grid, but keep hidden until first Next
    const wrap = ensureAllSubsetsContainer();
    buildAllSubsetsGrid(state.items, state.mask, state.items.length <= 6 ? (1 << state.items.length) : 64);

    if (wrap) wrap.style.display = "none";
    const grid = $("psAllSubsets");
    if (grid) grid.style.opacity = "0";
  }

  function renderSubset(mask) {
    const subset = $("psSubset");
    const empty = $("psSubsetEmpty");
    if (!subset) return;

    clear(subset);

    const chosen = subsetToList(state.items, mask);

    if (chosen.length === 0) {
      if (empty) empty.style.display = "block";
    } else {
      if (empty) empty.style.display = "none";
      chosen.forEach(x => subset.appendChild(makeSubsetChip(x.name, x.idx)));
    }

    highlightActiveCard(mask);
  }

  function revealGridIfNeeded() {
    const grid = $("psAllSubsets");
    if (!grid || state.revealedGrid) return;

    state.revealedGrid = true;

    const wrap = $("psAllWrap");
    if (wrap) wrap.style.display = "block";

    if (window.gsap) {
      gsap.to(grid, { opacity: 1, duration: 0.25 });
      gsap.fromTo(
        grid.querySelectorAll(".ps-subcard"),
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, stagger: 0.01, delay: 0.05 }
      );
    } else {
      grid.style.opacity = "1";
    }
  }

  function onNextClick() {
    if (!state.items.length) return;

    revealGridIfNeeded();

    const total = 1 << state.items.length;
    state.mask = (state.mask + 1) % total;

    renderSubset(state.mask);

    const box = $("psSubsetBox");
    if (box && window.gsap) {
      gsap.fromTo(box, { scale: 1 }, { scale: 1.02, duration: 0.12, yoyo: true, repeat: 1 });
    }
  }

  function sync(root = document) {
    const data = getData(root);
    if (!data) {
      // If no viz node exists yet, keep the page in "start hint" mode
      setPowersetTopQuestion("");
      return;
    }
    renderInitial(data);
    renderSubset(0);
  }

  function bind() {
    const btn = $("psNextBtn");
    if (!btn) return;
    // Using onclick avoids double-binding chaos across HTMX swaps
    btn.onclick = onNextClick;
  }

  document.addEventListener("DOMContentLoaded", () => {
    bind();
    sync(document);
  });

  // Only resync when the problem block swaps (new problem / reset)
  document.body.addEventListener("htmx:afterSwap", (evt) => {
    const t = evt.target;
    bind();

    // If the swap touched the powerset problem area, resync from the full document
    if (t && (t.id === "powerset-problem-area" || t.closest?.("#powerset-problem-area"))) {
      // small delay helps if hx-swap-oob also updates top question
      setTimeout(() => sync(document), 0);
    }
  });
})();
