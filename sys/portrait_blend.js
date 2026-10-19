// Image-only layers 1..3: capture the old picture, then blend to the new one.
// Blend premultiplied colors AND alpha in an isolated transparent canvas.
// Two ordinary source-over opacity fades would make unchanged bodies translucent.
// SV_Lay keeps the original HTML; canvases and intermediate pictures are not saved.
(() => {
  "use strict";
  const WIDTH = 640, HEIGHT = 480;

  function canvas() {
    const result = document.createElement("canvas");
    result.width = WIDTH;
    result.height = HEIGHT;
    Object.assign(result.style, { display: "block", position: "absolute", inset: "0",
      width: WIDTH + "px", height: HEIGHT + "px", pointerEvents: "none" });
    return result;
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
        else reject(new Error("立ち絵画像を読み込めません"));
        return;
      }
      const cleanup = () => {
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("立ち絵画像を読み込めません")); };
      image.addEventListener("load", loaded);
      image.addEventListener("error", failed);
    });
  }
  function controller(num) {
    const layer = document.getElementById("LAYER" + num);
    const surface = canvas(), ctx = surface.getContext("2d");
    let prepared = null, pending = null, active = null, current = null;
    Object.assign(layer.style, { width: WIDTH + "px", height: HEIGHT + "px",
      opacity: "1", transition: "none" });

    function signal(phase, entry, extra) {
      document.dispatchEvent(new CustomEvent("tokifuru-portrait-blend", {
        detail: { phase, layer: num, seconds: entry ? entry.seconds : 0,
          files: entry ? entry.sources.join(" + ") : "",
          request: entry ? entry.request : "", extra }
      }));
    }
    function updateState() {
      const shown = active ? [...new Set([...active.previousSources, ...active.sources])] :
        current ? current.sources : [];
      layer.dataset.portraitState = pending ? active ? "loading/fading" : "loading" :
        active ? "fading" : current && current.images.length ? "steady" : "empty";
      layer.dataset.portraitSources = JSON.stringify(shown);
      layer.dataset.portraitPrevious = JSON.stringify(active ? active.previousSources : []);
      layer.dataset.portraitNext = JSON.stringify(active ? active.sources : current ? current.sources : []);
      layer.dataset.portraitPending = JSON.stringify(pending ? pending.sources : []);
      layer.dataset.portraitProgress = String(active ? active.progress : 1);
    }
    function cancelClock(entry) {
      cancelAnimationFrame(entry.frame || 0);
      clearTimeout(entry.timer);
    }
    function cancelPending() {
      if (!pending) return;
      const entry = pending;
      pending = null;
      entry.host.remove();
      signal("CANCEL", entry, "次の画像指定に置換（古い読込完了通知も無効）");
    }
    function paint(entry, progress) {
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1 - progress;
      if (entry.previous && progress < 1) ctx.drawImage(entry.previous, 0, 0);
      // Add weighted premultiplied RGBA values, rather than compositing one
      // partially transparent character over another. Matching pixels retain
      // their original opacity, including the antialiased hair/outline edges.
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = progress;
      ctx.drawImage(entry.target, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      entry.progress = progress;
      layer.dataset.portraitProgress = String(progress);
    }
    function complete(entry, reason) {
      if (active !== entry) return;
      cancelClock(entry);
      // Render the target at full weight BEFORE releasing the old snapshot.
      paint(entry, 1);
      entry.previous = null;
      entry.previousSources = [];
      current = entry;
      active = null;
      updateState();
      signal("END", entry, reason + " / 新画像100%、旧画像を解放");
    }
    function freeze() {
      const previous = canvas();
      previous.getContext("2d").drawImage(surface, 0, 0);
      const previousSources = active ? [...new Set([...active.previousSources, ...active.sources])] :
        current ? current.sources.slice() : [];
      if (active) {
        const interrupted = active;
        cancelClock(interrupted);
        active = null;
        interrupted.previous = null;
        signal("INTERRUPT", interrupted, "現在表示中の合成画像から次の切替へ");
      }
      return { previous, previousSources };
    }
    function start(entry) {
      if (pending !== entry || !entry.ready || !entry.played) return;
      // The hidden original HTML supplies the exact table alignment and image
      // rectangle. It is measured only once, never on animation frames.
      const origin = layer.getBoundingClientRect();
      for (const item of entry.images) {
        const rect = item.image.getBoundingClientRect();
        item.x = rect.left - origin.left;
        item.y = rect.top - origin.top;
        item.width = rect.width;
        item.height = rect.height;
      }
      // Compose the new layer once using normal source-over. The title-load
      // screen also uses LAYER1 for two images; their internal stacking is
      // preserved before the old/new layer pictures are interpolated.
      entry.target = canvas();
      const targetContext = entry.target.getContext("2d");
      for (const item of entry.images) {
        targetContext.drawImage(item.image, item.x, item.y, item.width, item.height);
      }
      const oldPicture = freeze();
      pending = null;
      entry.host.remove();
      entry.host = null;
      Object.assign(entry, oldPicture, { progress: 0 });
      active = entry;
      current = null;
      if (surface.parentNode !== layer) layer.prepend(surface);
      updateState();
      if (entry.seconds <= 0 || (!entry.images.length && !entry.previousSources.length)) {
        complete(entry, "即時切替");
        return;
      }
      paint(entry, 0);
      entry.startedAt = performance.now();
      signal("START", entry, "新旧の色と透過を補間（共通部分の濃さを保持）");
      const tick = now => {
        if (active !== entry) return;
        const progress = Math.min(1, Math.max(0, (now - entry.startedAt) / (entry.seconds * 1000)));
        if (progress >= 1) { complete(entry, "フェード完了"); return; }
        paint(entry, progress);
        entry.frame = requestAnimationFrame(tick);
      };
      entry.frame = requestAnimationFrame(tick);
      entry.timer = setTimeout(() => complete(entry, "完了通知の補完"), entry.seconds * 1000 + 150);
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
        if (seconds <= 0) complete(active, "同じ画像の再描画で即時完了");
        updateState();
        return;
      }
      if (!active && current && current.html === html) { updateState(); return; }

      const host = document.createElement("div");
      Object.assign(host.style, { position: "absolute", inset: "0", width: WIDTH + "px",
        height: HEIGHT + "px", visibility: "hidden", pointerEvents: "none" });
      host.innerHTML = html;
      const allImages = [...host.querySelectorAll("img")];
      // chr/0000.png is the original fully transparent 1x1 exit sentinel.
      // Treat it as transparent directly; there is no image to load or paint.
      const images = allImages.filter(image =>
        !/(?:^|\/)chr\/0000\.png(?:[?#]|$)/i.test(image.getAttribute("src") || ""));
      const entry = { host, html, seconds, played, ready: !images.length, images: images.map(image => ({ image })),
        sources: allImages.map(image => image.getAttribute("src") || ""),
        request: SV_Page + ".dat:" + Number(SV_Line), progress: 0 };
      pending = entry;
      layer.appendChild(host);
      updateState();
      if (entry.ready) { start(entry); return; }
      signal("WAIT", entry, "画像の読込・デコード待ち（現在の立ち絵を保持）");
      Promise.all(images.map(imageReady)).then(() => {
        if (pending !== entry) return;
        entry.ready = true;
        start(entry);
      }, error => {
        if (pending !== entry) return;
        pending = null;
        entry.host.remove();
        updateState();
        signal("ERROR", entry, (error.message || String(error)) + " / 現在の立ち絵を保持");
      });
    }
    return {
      prepare(seconds) {
        prepared = Math.max(0, Number(seconds) || 0);
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
  }
  const slots = new Map([1, 2, 3].map(num => [num, controller(num)]));
  window.Demo3PortraitBlend = {
    prepare(num, seconds) { slots.get(num).prepare(seconds); },
    write(num, html) { slots.get(num).write(html); },
    play(num) { slots.get(num).play(); },
    finish(num) { slots.get(num).finish(); },
    finishAll() { for (const slot of slots.values()) slot.finish(); }
  };
  window.addEventListener("pagehide", () => window.Demo3PortraitBlend.finishAll());
})();
