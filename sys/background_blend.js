// Background-only equivalent of blendTrans.Apply() / Play().
// LAYER0 stays opaque. Only the incoming image fades above its previous picture.
// SV_Lay[0] continues to hold the original single-image HTML, never these planes.
(() => {
  "use strict";
  const layer = document.getElementById("LAYER0");
  // Original scene commands request 0.5s. Use 0.6s for the reported visual
  // pacing; redraw durations and instant/skip requests keep their own values.
  const SCENE_FADE_SECONDS = 0.6;
  let prepared = null, pending = null, active = null, current = null;
  Object.assign(layer.style, { width: "640px", height: "480px", opacity: "1", transition: "none" });

  function sources(plane) {
    return JSON.parse(plane.dataset.backgroundSources || "[]");
  }
  function signal(phase, entry, extra = "") {
    document.dispatchEvent(new CustomEvent("tokifuru-background-blend", {
      detail: { phase, seconds: entry ? entry.seconds : 0,
        files: entry ? sources(entry.plane).join(" + ") : "",
        request: entry ? entry.request : "", extra }
    }));
  }
  function updateState() {
    layer.dataset.backgroundState = pending ? "loading" : active ? "fading" : current ? "steady" : "empty";
  }
  function makePlane(html) {
    const plane = document.createElement("div");
    plane.dataset.backgroundPlane = "incoming";
    Object.assign(plane.style, { position: "absolute", inset: "0", width: "640px", height: "480px",
      opacity: "0", transition: "none", pointerEvents: "none" });
    plane.innerHTML = html;
    const images = [...plane.querySelectorAll("img")];
    images.forEach(image => { image.style.display = "block"; });
    plane.dataset.backgroundSources = JSON.stringify(images.map(image => image.getAttribute("src")));
    return plane;
  }
  function cancelClock(entry) {
    cancelAnimationFrame(entry.frame || 0);
    clearTimeout(entry.timer);
    if (entry.onEnd) entry.plane.removeEventListener("transitionend", entry.onEnd);
  }
  function cancelPending() {
    if (!pending) return;
    const entry = pending;
    pending = null;
    entry.plane.remove();
    signal("CANCEL", entry, "新しい背景指定に置換（読込完了後の古い通知も無効）");
  }
  function complete(entry, reason) {
    if (active !== entry) return;
    cancelClock(entry);
    // Make the new picture fully opaque BEFORE releasing the old picture.
    entry.plane.style.transition = "none";
    entry.plane.style.opacity = "1";
    entry.plane.dataset.backgroundPlane = "current";
    for (const plane of [...layer.children]) {
      if (plane !== entry.plane && (!pending || plane !== pending.plane)) plane.remove();
    }
    current = entry;
    active = null;
    updateState();
    signal("END", entry, reason + " / 新背景opacity=1、旧背景を解放");
  }
  function previousPicture(incoming) {
    const planes = [...layer.children].filter(plane => plane !== incoming);
    const opacity = planes.map(plane => Number(getComputedStyle(plane).opacity));
    if (active) {
      const interrupted = active;
      cancelClock(interrupted);
      active = null;
      signal("INTERRUPT", interrupted, "表示途中の合成状態から次の背景へ");
    }
    planes.forEach((plane, i) => {
      plane.style.transition = "none";
      plane.style.opacity = String(opacity[i]);
      plane.dataset.backgroundPlane = "previous";
    });
    const visible = planes.filter((plane, i) => opacity[i] > 0);
    if (!visible.length) return [];
    if (visible.length === 1 && Number(visible[0].style.opacity) === 1) return visible;

    // A second change can arrive during a fade. Freeze only the background's
    // current composite so the next change starts from the picture on screen.
    // This also prevents old partially faded planes from accumulating.
    const frozen = makePlane("");
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvas.style.display = "block";
    try {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 640, 480);
      for (const plane of visible) {
        ctx.globalAlpha = Number(plane.style.opacity);
        for (const image of plane.querySelectorAll("img, canvas")) ctx.drawImage(image, 0, 0, 640, 480);
      }
      frozen.appendChild(canvas);
      frozen.dataset.backgroundSources = JSON.stringify([...new Set(visible.flatMap(sources))]);
      frozen.dataset.backgroundPlane = "previous-composite";
      frozen.style.opacity = "1";
      return [frozen];
    } catch (e) {
      // If a picture cannot be copied, retain the frozen original planes.
      // Their opacity and order still preserve the visible background.
      return visible;
    }
  }
  function start(entry) {
    if (pending !== entry || !entry.ready || !entry.played) return;
    pending = null;
    if (entry.seconds <= 0) {
      if (active) cancelClock(active);
      active = entry;
      current = null;
      entry.plane.style.opacity = "1";
      layer.replaceChildren(entry.plane);
      complete(entry, "即時切替");
      return;
    }
    const previous = previousPicture(entry.plane);
    layer.replaceChildren(...previous, entry.plane);
    active = entry;
    current = null;
    updateState();
    entry.onEnd = ev => {
      if (ev.target === entry.plane && ev.propertyName === "opacity") complete(entry, "フェード完了");
    };
    entry.plane.addEventListener("transitionend", entry.onEnd);
    // Establish the incoming picture at opacity=0 before starting its fade.
    void entry.plane.offsetWidth;
    entry.frame = requestAnimationFrame(() => {
      if (active !== entry) return;
      entry.plane.style.transition = "opacity " + entry.seconds + "s linear";
      entry.plane.style.opacity = "1";
      signal("START", entry, "旧背景を保持、新背景のみopacity=0→1");
      entry.timer = setTimeout(() => complete(entry, "完了通知の補完"), entry.seconds * 1000 + 150);
    });
  }
  function imageReady(image) {
    if (typeof image.decode === "function") {
      return image.decode().catch(error => {
        if (!image.complete || !image.naturalWidth) throw error;
      });
    }
    return new Promise((resolve, reject) => {
      if (image.complete) {
        if (image.naturalWidth) resolve();
        else reject(new Error("背景画像を読み込めません"));
        return;
      }
      const cleanup = () => {
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("背景画像を読み込めません")); };
      image.addEventListener("load", loaded);
      image.addEventListener("error", failed);
    });
  }
  function write(html) {
    html = String(html || "");
    const seconds = prepared === null ? 0 : prepared;
    const played = prepared === null;
    prepared = null;
    if (pending && pending.html === html) {
      pending.seconds = seconds;
      pending.played = played;
      start(pending);
      return;
    }
    cancelPending();
    if (active && active.html === html) {
      if (seconds <= 0) complete(active, "同じ背景の再描画で即時完了");
      updateState();
      return;
    }
    if (!active && current && current.html === html) {
      updateState();
      return;
    }
    if (!html) {
      if (active) cancelClock(active);
      active = current = null;
      layer.replaceChildren();
      updateState();
      signal("CLEAR", null, "空の背景状態へ");
      return;
    }
    const entry = { plane: makePlane(html), html, seconds, played, ready: false,
      request: SV_Page + ".dat:" + Number(SV_Line) };
    pending = entry;
    layer.appendChild(entry.plane);
    updateState();
    signal("WAIT", entry, "新背景の読込・デコード待ち（旧背景を保持）");
    Promise.all([...entry.plane.querySelectorAll("img")].map(imageReady)).then(() => {
      if (pending !== entry) return;
      entry.ready = true;
      start(entry);
    }, error => {
      if (pending !== entry) return;
      pending = null;
      entry.plane.remove();
      updateState();
      signal("ERROR", entry, (error.message || String(error)) + " / 旧背景を保持");
    });
  }
  window.Demo3BackgroundBlend = {
    prepare(seconds) {
      const requested = Math.max(0, Number(seconds) || 0);
      prepared = requested === 0.5 ? SCENE_FADE_SECONDS : requested;
      layer.dataset.blendSeconds = String(prepared);
    },
    write,
    play() {
      prepared = null;
      if (pending) { pending.played = true; start(pending); }
    },
    finish() {
      prepared = null;
      if (active) complete(active, "スキップ等による即時完了");
      if (pending) { pending.seconds = 0; pending.played = true; start(pending); }
      layer.style.transition = "none";
      layer.style.opacity = "1";
      layer.dataset.blendSeconds = "0";
    }
  };
})();
