// The landing page: the console cycles through cartjam's screens, the social accounts in
// data/social.json show once they're ours ("claimed": true), and the waitlist form shows once
// data/waitlist.json has the mailing service's form address.
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

// The form posts straight to the mailing service, which sends the confirmation email (double
// opt-in). Its reply can't be read from here, so the page only says what happens next.
async function waitlist() {
  let config;
  try {
    config = await (await fetch("data/waitlist.json")).json();
  } catch {
    return;
  }
  if (!/^https:\/\//.test(config.action || "")) return;
  const form = document.getElementById("waitlist"), status = document.getElementById("waitlist-status");
  const email = document.getElementById("waitlist-email"), button = form.querySelector("button");
  if (config.service) document.getElementById("waitlist-service").textContent = config.service;
  form.hidden = false;
  document.getElementById("notify").classList.add("has-waitlist");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!email.checkValidity()) {
      status.textContent = "Enter an email address like you@example.com.";
      email.focus();
      return;
    }
    button.disabled = true;
    status.textContent = "Sending…";
    try {
      // A filled-in trap field means a bot; it gets the same answer without anything sent
      if (!form.elements.email_address_check.value) await fetch(config.action, { method: "POST", mode: "no-cors", body: new FormData(form) });
      form.reset();
      status.textContent = "Almost done: we sent you an email. Confirm your address there to join the list.";
    } catch {
      status.textContent = "That didn't go through. Check your connection and try again.";
    } finally {
      button.disabled = false;
    }
  });
}
waitlist();
