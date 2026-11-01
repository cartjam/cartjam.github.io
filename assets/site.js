// The page: consoles and games come from data/, the releases from this repo's GitHub
// releases. An image is named cartjam-<console>-<release>.img.xz, next to a .sha256 file.
const REPO = "cartjam/cartjam.github.io";
const IMAGE = /^cartjam-([a-z0-9]+)-(.+)\.img\.xz$/;

const $ = (id) => document.getElementById(id);
const state = { console: null, release: null, games: new Set(), platform: "psp" };
let consoles = [], catalog = { platforms: [], games: [] }, releases = [];

const size = (bytes) =>
  bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  e.append(...children.filter((c) => c != null));
  return e;
}

// A drawing of the console: the body, screen, pad, buttons and sticks, with the real home
// screen on the display when there's a picture of it.
function drawing(c) {
  const square = c.shape === "square";
  const w = square ? 420 : 460, h = square ? 270 : 230;
  const sh = h - 54, sw = square ? sh : Math.round((sh * 4) / 3);
  const sx = (w - sw) / 2, sy = 27;
  const left = sx / 2, right = w - sx / 2;
  const off = c.status !== "available";
  const body = off ? "#3a3744" : "#2b2838", detail = off ? "#55525f" : "#17151f", accent = off ? "#6b6875" : "#e0245e";
  const button = (x, y, label) => `<circle cx="${x}" cy="${y}" r="9" fill="${accent}"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" font-size="10" font-weight="600" fill="#fff3df">${label}</text>`;
  const stick = (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="${detail}"/><circle cx="${x}" cy="${y}" r="12" fill="${off ? "#6b6875" : "#454152"}"/>`;
  const pad = (x, y) => `<path d="M${x - 7} ${y - 22}h14v15h15v14h-15v15h-14v-15h-15v-14h15z" fill="${detail}"/>`;
  const screen = c.picture
    ? `<image href="${c.picture}" x="${sx}" y="${sy}" width="${sw}" height="${sh}" preserveAspectRatio="xMidYMid slice" clip-path="url(#s-${c.id})"/>`
    : `<rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="5" fill="${detail}"/>`;
  return `<svg viewBox="0 0 ${w} ${h + 8}" role="img" aria-label="Drawing of the ${c.name}" font-family="Space Grotesk, sans-serif">
    <defs><clipPath id="s-${c.id}"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="5"/></clipPath></defs>
    <rect x="26" y="0" width="74" height="24" rx="10" fill="${detail}"/><rect x="${w - 100}" y="0" width="74" height="24" rx="10" fill="${detail}"/>
    <rect x="4.5" y="8.5" width="${w - 9}" height="${h - 1}" rx="30" fill="${body}" stroke="#fff3df" stroke-opacity="0.16"/>
    <rect x="${sx - 7}" y="${sy - 7}" width="${sw + 14}" height="${sh + 14}" rx="9" fill="#0e0d13"/>
    ${screen}
    ${pad(left, h * 0.33)}${stick(left, h * 0.72)}
    ${button(right, h * 0.33 - 21, "X")}${button(right, h * 0.33 + 21, "B")}${button(right - 21, h * 0.33, "Y")}${button(right + 21, h * 0.33, "A")}
    ${stick(right, h * 0.72)}
    <rect x="${left - 10}" y="${h - 9}" width="20" height="5" rx="2.5" fill="${detail}"/><rect x="${right - 22}" y="${h - 9}" width="18" height="5" rx="2.5" fill="${detail}"/><rect x="${right + 4}" y="${h - 9}" width="18" height="5" rx="2.5" fill="${detail}"/>
  </svg>`;
}

function renderConsoles() {
  const box = $("consoles");
  box.replaceChildren(...consoles.map((c) => {
    const off = c.status !== "available";
    const label = el("label", { class: "choice console-choice" },
      el("input", {
        type: "radio", name: "console", value: c.id, disabled: off, checked: state.console === c.id,
        onchange: () => { state.console = c.id; state.release = null; renderReleases(); renderSummary(); },
      }),
      el("b", {}, c.name, off ? el("span", { class: "tag" }, "Pending") : null),
      el("small", {}, `${c.chip}, ${c.screen}`));
    const art = document.createElement("div");
    art.innerHTML = drawing({ ...c, id: `${c.id}-small`, picture: off ? null : c.picture });
    label.prepend(art.firstElementChild);
    return label;
  }));
}

function imagesFor(id) {
  return releases.flatMap((r) => r.assets
    .filter((a) => IMAGE.exec(a.name)?.[1] === id)
    .map((a) => ({
      tag: r.tag_name,
      name: r.name || r.tag_name,
      date: (r.published_at || "").slice(0, 10),
      prerelease: r.prerelease,
      notes: r.html_url,
      url: a.browser_download_url,
      file: a.name,
      size: a.size,
    })));
}

function renderReleases(failed) {
  const box = $("releases");
  const found = imagesFor(state.console);
  if (failed) {
    box.replaceChildren(el("p", { class: "note" }, "Couldn't reach GitHub for the list of releases. ",
      el("a", { href: `https://github.com/${REPO}/releases` }, "See them on GitHub"), "."));
  } else if (!found.length) {
    box.replaceChildren(el("p", { class: "note" }, "No public release yet. The first one comes once it has passed its tests on a real console."));
  } else {
    if (!found.some((r) => r.tag === state.release?.tag)) {
      state.release = found.find((r) => !r.prerelease) || found[0];
    }
    box.replaceChildren(...found.map((r) => el("label", { class: "choice" },
      el("input", {
        type: "radio", name: "release", value: r.tag, checked: r.tag === state.release.tag,
        onchange: () => { state.release = r; renderSummary(); renderFlash(); },
      }),
      el("b", {}, r.name, r === found.find((x) => !x.prerelease)
        ? el("span", { class: "tag good" }, "Latest")
        : r.prerelease ? el("span", { class: "tag" }, "Preview") : null),
      el("small", {}, `${r.date}, ${size(r.size)} download. `, el("a", { href: r.notes }, "What's new")))));
  }
  renderFlash();
}

function renderPlatforms() {
  $("platforms").replaceChildren(...catalog.platforms.map((p) => {
    const off = p.status !== "available";
    return el("button", {
      role: "tab", disabled: off, "aria-selected": String(state.platform === p.id), title: off ? "Pending" : null,
      onclick: () => { state.platform = p.id; renderPlatforms(); renderGames(); },
    }, p.name);
  }));
}

function renderGames() {
  $("games").replaceChildren(...catalog.games.filter((g) => g.platform === state.platform).map((g) =>
    el("article", { class: "game" },
      el("img", { src: g.shot, alt: `${g.name} on screen`, loading: "lazy", width: 480, height: 270 }),
      el("div", {},
        el("h4", {}, g.name, g.tested ? null : el("span", { class: "tag" }, "Not tested yet")),
        el("p", {}, g.about),
        el("p", { class: "license" }, `${g.by}. ${g.license}. `, el("a", { href: g.source }, "Source")),
        el("div", { class: "row" },
          el("label", { class: "pick" }, el("input", {
            type: "checkbox", checked: state.games.has(g.id),
            onchange: (e) => { e.target.checked ? state.games.add(g.id) : state.games.delete(g.id); renderSummary(); renderCopyStep(); },
          }), "Add"),
          el("a", { class: "button small", href: g.download }, `Download, ${size(g.size)}`))))));
}

function renderCopyStep() {
  const chosen = catalog.games.filter((g) => state.games.has(g.id));
  const li = $("copy-games");
  li.replaceChildren("Switch off, put the card back in your computer, and unzip ",
    ...(chosen.length
      ? chosen.flatMap((g, i) => [i ? ", " : "", el("a", { href: g.download }, g.name)])
      : ["your games"]),
    " into the ", el("code", {}, "psp"), " folder on ", el("b", {}, "GAMES"), ".");
}

function renderSummary() {
  const c = consoles.find((x) => x.id === state.console);
  $("picture").innerHTML = c ? drawing(c) : "";
  $("sum-console").textContent = c ? c.name : "–";
  $("sum-release").textContent = state.release ? state.release.name : "None yet";
  const chosen = catalog.games.filter((g) => state.games.has(g.id));
  $("sum-games").textContent = chosen.length ? chosen.map((g) => g.name).join(", ") : "None";
}

function renderFlash() {
  const r = state.release, link = $("download");
  link.setAttribute("aria-disabled", String(!r));
  link.href = r ? r.url : "#";
  link.textContent = r ? `Download ${r.name}` : "No release to download yet";
  $("download-note").textContent = r ? size(r.size) : "";
  $("command").textContent = r
    ? `curl -fsSL https://cartjam.github.io/flash.sh | sh -s -- ${state.console} ${r.tag}`
    : "No release to write yet";
  $("copy").hidden = !r;
  renderSummary();
}

function setUpMethods() {
  const tabs = [...$("methods").querySelectorAll("button")];
  for (const tab of tabs) {
    tab.addEventListener("click", () => {
      for (const t of tabs) {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        $(`method-${t.dataset.method}`).hidden = !on;
      }
    });
  }
  $("copy").addEventListener("click", async () => {
    const button = $("copy"), text = $("command").textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
    } catch {
      getSelection().selectAllChildren($("command"));
      button.textContent = "Press copy";
    }
    setTimeout(() => { button.textContent = "Copy"; }, 1600);
  });
}

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function start() {
  setUpMethods();
  [consoles, catalog] = await Promise.all([json("data/consoles.json"), json("data/games.json")]);
  state.console = consoles.find((c) => c.status === "available")?.id;
  renderConsoles();
  renderPlatforms();
  renderGames();
  renderCopyStep();
  renderSummary();
  try {
    releases = await json(`https://api.github.com/repos/${REPO}/releases?per_page=30`);
    renderReleases();
  } catch (err) {
    console.warn(err);
    renderReleases(true);
  }
}

start();
