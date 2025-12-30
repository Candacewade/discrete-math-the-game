gsap.defaults({ ease: "power3.out" });
const svgNS = "http://www.w3.org/2000/svg";

// 5 distinct shirt colors (baby-blue-ish palette)
const SHIRT_COLORS = ["#BFE7FF", "#8FD3FF", "#5FBFFF", "#3AA8FF", "#1F8FFF"];
// 5 distinct pants colors (beige palette)
const PANTS_COLORS = ["#F3E6C9", "#EAD8B3", "#E1CA9B", "#D7BC86", "#CFAF73"];

function clearGroup(id) {
  const g = document.getElementById(id);
  if (!g) return;
  while (g.firstChild) g.removeChild(g.firstChild);
}

function makeCircle(cx, cy, r, className, fill) {
  const c = document.createElementNS(svgNS, "circle");
  c.setAttribute("cx", cx);
  c.setAttribute("cy", cy);
  c.setAttribute("r", r);
  if (className) c.setAttribute("class", className);
  if (fill) c.setAttribute("fill", fill);
  return c;
}

function makeLine(x1, y1, x2, y2, className) {
  const l = document.createElementNS(svgNS, "line");
  l.setAttribute("x1", x1);
  l.setAttribute("y1", y1);
  l.setAttribute("x2", x2);
  l.setAttribute("y2", y2);
  if (className) l.setAttribute("class", className);

  // stroke-draw setup (manual length)
  const len = Math.hypot(x2 - x1, y2 - y1);
  l.style.strokeDasharray = `${len}`;
  l.style.strokeDashoffset = `${len}`;
  return l;
}

function buildOutfitsTree(shirts, pants) {
  clearGroup("edgesGroup");
  clearGroup("shirtsGroup");
  clearGroup("pantsGroup");

  const edgesG = document.getElementById("edgesGroup");
  const shirtsG = document.getElementById("shirtsGroup");
  const pantsG = document.getElementById("pantsGroup");
  const scene = document.getElementById("scene");

  if (!edgesG || !shirtsG || !pantsG || !scene) return;

  // Layout constants
  const rootX = 120;
  const shirtX = 280;
  const leafX = 600;

  const marginTop = 70;
  const marginBottom = 60;

  const leafGap = 26;   // spacing between pants leaves
  const groupGap = 24;  // spacing between shirt groups

  const leafSpan = (pants - 1) * leafGap;
  const blockHeight = leafSpan + groupGap;

  const totalHeight = marginTop + marginBottom + shirts * blockHeight;
  const viewHeight = Math.max(260, totalHeight);
  scene.setAttribute("viewBox", `0 0 800 ${viewHeight}`);

  // Place equation centered under the graph
  const eqText = document.getElementById("eqText");
  if (eqText) {
    eqText.setAttribute("x", 400);
    eqText.setAttribute("text-anchor", "middle");
    eqText.setAttribute("y", viewHeight - 20);
    eqText.style.opacity = "0";
  }

  const rootY = marginTop + (shirts * blockHeight - groupGap) / 2;

  // Root node
  const root = makeCircle(rootX, rootY, 10, "rootDot");
  root.style.opacity = "0";
  shirtsG.appendChild(root);

  // Create shirt groups
  for (let i = 0; i < shirts; i++) {
    const groupTop = marginTop + i * blockHeight;
    const shirtY = groupTop + leafSpan / 2;

    const shirtColor = SHIRT_COLORS[i % SHIRT_COLORS.length];

    // trunk edge root -> shirt
    const trunk = makeLine(rootX + 12, rootY, shirtX - 12, shirtY, "edge trunkEdge");
    trunk.style.opacity = "0";
    edgesG.appendChild(trunk);

    // shirt node
    const shirtDot = makeCircle(shirtX, shirtY, 10, "shirtDot", shirtColor);
    shirtDot.style.opacity = "0";
    shirtsG.appendChild(shirtDot);

    // pants leaves for this shirt (repeated per shirt branch)
    for (let j = 0; j < pants; j++) {
      const leafY = groupTop + j * leafGap;
      const pantColor = PANTS_COLORS[j % PANTS_COLORS.length];

      // branch edge shirt -> leaf
      const branch = makeLine(shirtX + 12, shirtY, leafX - 12, leafY, "edge branchEdge");
      branch.style.opacity = "0";
      edgesG.appendChild(branch);

      // leaf node (pants choice for this branch)
      const leaf = makeCircle(leafX, leafY, 9, "pantLeaf", pantColor);
      leaf.style.opacity = "0";
      pantsG.appendChild(leaf);
    }
  }
}

function colorizePrompt(text) {
  if (!text) return "";
  return text
    .replace(/\bshirts?\b/gi, (m) => `<span class="term-shirt">${m}</span>`)
    .replace(/\bpants?\b/gi, (m) => `<span class="term-pants">${m}</span>`);
}

function setTopQuestionFromPrompt(prompt) {
  const top = document.getElementById("topQuestion");
  if (!top) return;

  const bottom = document.getElementById("productPromptText");
  if (bottom && prompt) bottom.innerHTML = colorizePrompt(prompt);

  if (prompt) {
    top.classList.remove("start-hint");   // stop being green once it's a real question
    top.innerHTML = colorizePrompt(prompt);
  } else {
    top.classList.add("start-hint");
    top.textContent = "Click “New problem” to start, then hit next to visualize the problem.";
  }
}


function syncOutfitsViz(root) {
  const el = root.querySelector('[data-viz="outfits"]');
  if (!el) return;

  const shirts = Number(el.dataset.shirts);
  const pants = Number(el.dataset.pants);

  setTopQuestionFromPrompt(el.dataset.prompt);

  // Update labels + equation text
  const a = document.getElementById("stepALabel");
  const b = document.getElementById("stepBLabel");
  const eq = document.getElementById("eqText");

  if (a) a.textContent = `Choose a shirt (${shirts})`;
  if (b) b.textContent = `Then choose pants (${pants})`;
  if (eq) eq.textContent = `Total = ${shirts} × ${pants}`;

  buildOutfitsTree(shirts, pants);

  // Reset step index so Next always starts at step 1 for a new problem
  stepIndex = 0;
}

// Anim steps
let stepIndex = 0;

const steps = [
  // Step 1: show root + shirts + trunk edges
  () => {
    const tl = gsap.timeline();
    tl.to(".rootDot", { opacity: 1, duration: 0.18 })
      .to(".trunkEdge", { opacity: 1, duration: 0.08, stagger: 0.03 }, "-=0.05")
      .to(".trunkEdge", { strokeDashoffset: 0, duration: 0.35, stagger: 0.03 }, "-=0.02")
      .to(".shirtDot", { opacity: 1, duration: 0.18, stagger: 0.05 }, "-=0.25");
  },

  // Step 2: show leaves + branch edges
  () => {
    const tl = gsap.timeline();
    tl.to(".branchEdge", { opacity: 1, duration: 0.06, stagger: 0.01 })
      .to(".branchEdge", { strokeDashoffset: 0, duration: 0.32, stagger: 0.01 }, "-=0.02")
      .to(".pantLeaf", { opacity: 1, duration: 0.18, stagger: 0.01 }, "-=0.25");
  },

  // Step 3: show equation
  () => {
    gsap.to("#eqText", { opacity: 1, duration: 0.16 });
    gsap.to("#eqText", { scale: 1.03, yoyo: true, repeat: 1, duration: 0.16 });
  },
];

document.getElementById("nextBtn")?.addEventListener("click", () => {
  steps[stepIndex % steps.length]();
  stepIndex++;
});

// Run on first load (if a problem exists on page load)
document.addEventListener("DOMContentLoaded", () => syncOutfitsViz(document));

// Run after HTMX swaps in a new problem
document.body.addEventListener("htmx:afterSwap", (evt) => {
  if (evt.target && evt.target.id === "problem-area") {
    syncOutfitsViz(evt.target);
  }
});

let confettiFired = false;

function fireConfettiBurst() {
  if (confettiFired) return;
  confettiFired = true;

  // A quick "Brilliant-ish" burst
  confetti({
    particleCount: 140,
    spread: 70,
    origin: { y: 0.35 },
    scalar: 1.0
  });

  // little follow-up pop
  setTimeout(() => {
    confetti({
      particleCount: 70,
      spread: 90,
      origin: { y: 0.35 },
      scalar: 0.9
    });
  }, 180);
}

document.body.addEventListener("htmx:afterSwap", (evt) => {
  // when the level-area gets swapped in, check if it contains the completion banner
  if (evt.target && evt.target.id === "level-area") {
    const done = evt.target.querySelector(".level-complete");
    if (done) fireConfettiBurst();
  }
});

// If the page loads already complete , still fire once
document.addEventListener("DOMContentLoaded", () => {
  const done = document.querySelector("#level-area .level-complete");
  if (done) fireConfettiBurst();
});

document.body.addEventListener("htmx:afterSwap", (evt) => {
  if (evt.target && evt.target.id === "problem-area") {
    // optional spot; better is below with level-area check
  }
});

document.body.addEventListener("htmx:afterSwap", (evt) => {
  if (evt.target && evt.target.id === "level-area") {
    const done = evt.target.querySelector(".level-complete");
    if (!done) confettiFired = false; // allow future celebration
  }
});
 
