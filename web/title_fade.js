// Original Title(): fade background, logo/menu and help for two seconds.
// Keep this separate from the scenario's background timing adjustment.
// v5.6.18: the screen behind the fading title can be white after a white
// ending roll (ED 3 / ED 11), so the title fades in from the roll's colour.
(() => {
  "use strict";
  const game = document.getElementById("game-screen");
  const background = document.getElementById("title-background");
  const ui = document.getElementById("game-ui");
  const logo = document.getElementById("title-logo");
  const hotspots = [...game.querySelectorAll(".title-hotspot")];
  let sequence = 0, frame = 0, timer = 0, removeEndListener = null, current = null;

  function notify(phase, entry, reason = "") {
    document.dispatchEvent(new CustomEvent("tokifuru-title-fade", {
      detail: { phase, seconds: entry.seconds, background: entry.background,
        base: entry.base, reason }
    }));
  }
  function clearWork() {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    frame = timer = 0;
    if (removeEndListener) removeEndListener();
    removeEndListener = null;
  }
  function enableControls() {
    ui.inert = false;
    hotspots.forEach(button => { button.disabled = false; });
  }
  function cancel(reason = "タイトルを離れたため") {
    sequence++;
    clearWork();
    if (current) notify("CANCEL", current, reason);
    current = null;
    game.classList.remove("title-preparing", "title-fading");
    game.style.backgroundColor = "";
    game.dataset.titleFadeState = "idle";
    enableControls();
  }
  async function imageReady(image) {
    if (typeof image.decode === "function") {
      try { await image.decode(); return true; }
      catch (e) { return image.complete && image.naturalWidth > 0; }
    }
    if (image.complete) return image.naturalWidth > 0;
    return new Promise(resolve => {
      const done = () => {
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
        resolve(image.naturalWidth > 0);
      };
      image.addEventListener("load", done);
      image.addEventListener("error", done);
    });
  }
  function finish(entry, reason) {
    if (current !== entry || sequence !== entry.token) return;
    clearWork();
    game.classList.remove("title-preparing", "title-fading");
    // The opaque title background now covers the whole screen.
    game.style.backgroundColor = "";
    game.dataset.titleFadeState = "ready";
    current = null;
    notify("END", entry, reason);
  }
  function begin(entry, onReady) {
    if (current !== entry || sequence !== entry.token || game.style.display !== "block") return;
    if (entry.seconds > 0) {
      const completed = new Set();
      const onEnd = ev => {
        if (ev.propertyName !== "opacity" || (ev.target !== background && ev.target !== ui)) return;
        completed.add(ev.target);
        if (completed.size === 2) finish(entry, "背景・メニューのフェード完了");
      };
      game.addEventListener("transitionend", onEnd);
      removeEndListener = () => game.removeEventListener("transitionend", onEnd);
    }
    enableControls();
    game.dataset.titleFadeState = "fading";
    game.classList.replace("title-preparing", "title-fading");
    notify("START", entry, "背景とロゴ・メニュー・操作説明を同時に表示" +
      (entry.base ? " / " + (entry.base === "#fff" ? "白" : entry.base) + "から" : ""));
    if (entry.seconds > 0) {
      timer = setTimeout(() => finish(entry, "完了通知の補完"), entry.seconds * 1000 + 150);
    } else {
      finish(entry, "画像フェードOFFによる即時表示");
    }
    if (onReady) onReady();
  }
  function start(path, seconds, base, onReady) {
    cancel("タイトルの再表示");
    const entry = { token: sequence, seconds: Math.max(0, Number(seconds) || 0), background: path,
      base: base === "#fff" ? "#fff" : "" };
    current = entry;
    game.style.backgroundColor = entry.base;
    game.style.setProperty("--title-fade-seconds", entry.seconds + "s");
    game.dataset.titleFadeSeconds = String(entry.seconds);
    game.dataset.titleFadeState = "loading";
    game.classList.add("title-preparing");
    ui.inert = true;
    hotspots.forEach(button => { button.disabled = true; });
    notify("WAIT", entry, "タイトル背景とロゴの読込・デコード待ち");
    const image = new Image();
    image.src = path;
    Promise.all([imageReady(image), imageReady(logo)]).then(ready => {
      if (current !== entry || sequence !== entry.token) return;
      if (ready.includes(false)) notify("IMAGE ERROR", entry, "画像の読込失敗");
      if (entry.seconds === 0) { begin(entry, onReady); return; }
      // Paint both independent layers at opacity=0 before changing to 1.
      frame = requestAnimationFrame(() => {
        if (current !== entry || sequence !== entry.token) return;
        frame = requestAnimationFrame(() => begin(entry, onReady));
      });
    });
  }
  window.TokiTitleFade = { start, cancel };
})();
