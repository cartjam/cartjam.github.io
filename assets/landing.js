// The landing page: the console cycles through cartjam's screens, and the social accounts in
// data/social.json show once they're ours ("claimed": true).
const screens = [...document.querySelectorAll(".screens img")];
const caption = document.getElementById("screen-caption");
const still = matchMedia("(prefers-reduced-motion: reduce)");
let current = screens.findIndex((s) => s.classList.contains("on")), timer = 0;

function show(n) {
  screens[current].classList.remove("on");
  current = n % screens.length;
  screens[current].classList.add("on");
  caption.textContent = screens[current].dataset.caption;
}

function play() {
  clearTimeout(timer);
  if (still.matches || document.visibilityState !== "visible") return;
  timer = setTimeout(() => { show(current + 1); play(); }, Number(screens[current].dataset.ms));
}

document.addEventListener("visibilitychange", play);
still.addEventListener("change", play);
play();

async function social() {
  try {
    const accounts = (await (await fetch("data/social.json")).json()).filter((a) => a.claimed);
    if (!accounts.length) return;
    document.getElementById("social").replaceChildren(...accounts.map((a) => {
      const li = document.createElement("li"), link = document.createElement("a"), b = document.createElement("b"), handle = document.createElement("span");
      link.href = a.url;
      b.textContent = a.name;
      handle.textContent = a.handle;
      link.append(b, handle);
      li.append(link);
      return li;
    }));
    document.getElementById("follow").hidden = false;
  } catch {
    // Without the list the page still says how to hear about the release
  }
}
social();
