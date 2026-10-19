// Passive observers around the existing engine. Original arguments, results,
// exceptions and promises pass through unchanged; no scenario/state writes.
(() => {
  "use strict";
  if (window.parent === window) return;
  const labels = ["背景", "立ち絵・左", "立ち絵・右", "立ち絵・中央"];
  const watchedAudio = new WeakSet();
  let pending = [], omitted = 0, flushTimer = 0, stateTimer = 0, active = false;
  let lastRead = "なし", lastCommand = "なし";

  function send(data) {
    try { window.parent.postMessage(data, location.origin); } catch (e) {}
  }
  function where() { return SV_Page + ".dat:" + Number(SV_Line); }
  function log(kind, message) {
    if (pending.length >= 300) { pending.shift(); omitted++; }
    pending.push({ time: Date.now(), kind, message: String(message), where: where() });
    if (!flushTimer) flushTimer = setTimeout(flush, 60);
  }
  function shortPath(value) {
    if (!value) return "なし";
    try { return decodeURI(new URL(value, location.href).pathname).replace(/^\//, ""); }
    catch (e) { return String(value); }
  }
  function imagePaths(html) {
    const paths = [];
    const pattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let match;
    while ((match = pattern.exec(String(html || "")))) {
      paths.push(shortPath(match[1] || match[2] || match[3]));
    }
    return [...new Set(paths)].join(" + ") || "なし";
  }
  function layerLabel(num) { return "L" + num + " " + labels[num]; }
  function backgroundSources(plane) {
    return JSON.parse(plane.dataset.backgroundSources || "[]").map(shortPath).join(" + ") || "なし";
  }
  function portraitSources(value) {
    return JSON.parse(value || "[]").map(shortPath).join(" + ") || "なし";
  }
  function snapshot() {
    const lines = [
      "シナリオ：sys/" + SV_Page + ".dat / 次の行=" + (Number(SV_Line) + 1),
      "直前に読込：" + lastRead,
      "直前の命令：" + lastCommand,
      "モード=" + (sts_mode || "初期化中") + " / 直前本文の既読=" + (itskidok ? "はい" : "いいえ"),
      "SKIP=" + !!sts_skip + " / Enter省略=" + !!sts_force_skip + " / Ctrl=" + !!nowctrl,
      "画像フェード=" + !!CGFSW + " / 未読停止=" + !!SKPSW + " / AUTO=" + !!AUTSW
    ];
    for (let i = 0; i <= 3; i++) {
      const layer = document.getElementById("LAYER" + i);
      const style = getComputedStyle(layer);
      const planes = i === 0 ? [...layer.querySelectorAll("[data-background-plane]")] : [];
      const shown = i > 0 && layer.dataset.portraitState ? portraitSources(layer.dataset.portraitSources) :
        planes.length ? planes.map(backgroundSources).join(" + ") :
        [...layer.querySelectorAll("img")].map(img => shortPath(img.getAttribute("src"))).join(" + ") || "なし";
      lines.push(layerLabel(i) + "：指定 " + imagePaths(SV_Lay[i]) +
        " / 表示 " + shown + "\n  visibility=" + style.visibility +
        " / opacity=" + Number(style.opacity).toFixed(2) +
        " / fade=" + (layer.dataset.blendSeconds || "0") + "s");
      if (i === 0) {
        lines.push("  背景処理=" + (layer.dataset.backgroundState || "初期化中"));
        for (const plane of planes) {
          lines.push("  " + plane.dataset.backgroundPlane + "：" + backgroundSources(plane) +
            " / opacity=" + Number(getComputedStyle(plane).opacity).toFixed(2));
        }
      } else if (layer.dataset.portraitState) {
        const progress = Number(layer.dataset.portraitProgress || "1");
        lines.push("  立ち絵処理=" + layer.dataset.portraitState + " / 色・透過を補間");
        lines.push("  旧：" + portraitSources(layer.dataset.portraitPrevious) +
          " / 重み=" + (1 - progress).toFixed(2));
        lines.push("  新：" + portraitSources(layer.dataset.portraitNext) +
          " / 重み=" + progress.toFixed(2));
        if (layer.dataset.portraitPending !== "[]") {
          lines.push("  読込待ち：" + portraitSources(layer.dataset.portraitPending));
        }
      }
    }
    const frameLayer = document.getElementById("LAYER5");
    const resident = window.Demo3TextWindowImages ? window.Demo3TextWindowImages.status() : null;
    lines.push("L5 テキスト枠：表示 " + ([...frameLayer.querySelectorAll("img")]
      .map(img => shortPath(img.getAttribute("src")) + (img.complete ? "" : "（読込中）")).join(" + ") || "なし") +
      " / visibility=" + getComputedStyle(frameLayer).visibility +
      "\n  常駐UI画像=" + (resident ? resident.loaded + "/" + resident.total + " 読込済" : "なし"));
    const music = SV_Mus && SV_Mus !== "off" && SV_Mus !== "00" ? "bgm/" + SV_Mus + ".mp3" : "停止";
    lines.push("BGM指定：" + music + " / 設定=" + !!BGMSW);
    for (let i = 0; i <= 1; i++) {
      const audio = MUS_AudioChannels[i];
      if (!audio || !audio.src) continue;
      const status = audio.error ? "エラー " + audio.error.code : audio.ended ? "終了" :
        audio.paused ? "停止中" : audio.readyState < 3 ? "データ待ち" : "再生中";
      lines.push("  CH" + i + " " + shortPath(audio.currentSrc || audio.src) + " / " + status);
    }
    if (MUS_BlockedByAutoplay) lines.push("  自動再生制限：操作による再開待ち");
    const seHost = document.getElementById("SE");
    const se = seHost.querySelector("[src], object[data]");
    lines.push("SE指定=" + SV_SE + " / 設定=" + !!SESW +
      " / 埋込=" + (se ? shortPath(se.getAttribute("src") || se.getAttribute("data")) :
        seHost.children.length ? "プレイヤーあり（src未公開）" : "なし"));
    if (TokifuruMovieActive) {
      const movie = TOKIFURU_EVENT_MANIFEST[TokifuruMovieActive];
      lines.push("ムービー：" + (movie ? shortPath(movie.file) : TokifuruMovieActive));
    }
    const photo = document.getElementById("ending-photo");
    if (sts_mode === "ending" && photo.getAttribute("src")) lines.push("ED画像：" + shortPath(photo.src));
    lines.push("状態通知：" + (document.getElementById("runtime-status").textContent || "なし"));
    return lines.join("\n");
  }
  function flush() {
    clearTimeout(flushTimer);
    flushTimer = 0;
    const records = pending;
    pending = [];
    if (omitted) {
      records.unshift({ time: Date.now(), kind: "DEBUG", where: where(),
        message: "高速処理中の古いログ " + omitted + " 件を省略（直近300件を保持）" });
      omitted = 0;
    }
    const data = { type: "tokifuru-debug-data", records };
    if (active) {
      try { data.state = snapshot(); }
      catch (e) { data.state = "デバッグ情報取得エラー：" + (e.message || String(e)); }
    }
    send(data);
  }
  // A diagnostic failure must never alter the engine's own execution path.
  function observe(name, before, after) {
    const original = window[name];
    if (typeof original !== "function") return;
    window[name] = function(...args) {
      let context;
      try { if (before) context = before(args); } catch (e) {}
      const result = original.apply(this, args);
      try { if (after) after(args, result, context); } catch (e) {}
      return result;
    };
  }
  function watchAudio(audio, channel) {
    if (!audio || watchedAudio.has(audio)) return;
    watchedAudio.add(audio);
    for (const event of ["playing", "pause", "ended", "error"]) {
      audio.addEventListener(event, () => log("AUDIO", "CH" + channel + " " +
        shortPath(audio.currentSrc || audio.src) + " / " + event +
        (audio.error ? " code=" + audio.error.code : "")));
    }
  }
  observe("getstr", null, (args, result) => {
    lastRead = where();
    if (typeof result !== "string" || result.charAt(0) !== "#") return;
    // Text and flag commands are intentionally excluded from the event log.
    if (/^#(?:g[0-3]|[mMpveJjs*]|#)/.test(result)) {
      lastCommand = where() + " " + result.trim();
      log("SCRIPT", result.trim() + (sts_skip ? " / skip" : "") +
        (sts_force_skip ? " / Enter省略" : ""));
    }
  });
  observe("LoadChapter", null, () => log("SCENE", "sys/" + SV_Page + ".dat 読込"));
  observe("WriteLayer", args => args[0] <= 3 ? imagePaths(SV_Lay[args[0]]) : "", (args, result, previous) => {
    const num = Number(args[0]);
    if (num < 0 || num > 3) return;
    const next = imagePaths(args[1]);
    if (previous !== next) log("IMAGE", layerLabel(num) + " " + previous + " → " + next +
      (sts_skip ? " / 指定のみ（skip中）" : " / DOM更新"));
  });
  observe("SetBlend", null, args => {
    const layer = document.getElementById("LAYER" + args[0]);
    log("FADE PREP", layerLabel(args[0]) + " 指定=" + args[1] + "s / " +
      (sts_force_skip ? "Enter省略" : "適用=" + (layer.dataset.blendSeconds || "0") + "s"));
  });
  observe("GoBlend", null, args => {
    const layer = document.getElementById("LAYER" + args[0]);
    log("FADE PLAY", layerLabel(args[0]) + " / " +
      (sts_force_skip ? "Enter省略" : "適用=" + (layer.dataset.blendSeconds || "0") + "s"));
  });
  observe("Demo3FinishImageBlends", null, () => log("FADE", "画像フェードを完了状態へ"));
  observe("Redraw", args => log("REDRAW", "保存中のレイヤーを再表示 / fade=" + !!args[0]));
  observe("Demo3SetStatus", null, args => log("STATUS", args[0]));
  observe("Saveit", args => log("SAVE", "スロット " + args[0] + " 保存要求"));
  observe("Loadit", args => log("LOAD", "スロット " + args[0] + " 読込要求"));
  observe("PF1", args => log("SKIP", args[0] ? "Enter省略 要求 / 未読停止=" + !!SKPSW : "通常スキップ 要求"));
  observe("Skipoff", null, () => log("SKIP", "スキップ終了 / mode=" + sts_mode));
  observe("InitMusic", null, () => MUS_AudioChannels.forEach(watchAudio));
  // Prepared audio replaces channel objects; observe those replacements too.
  observe("MUS_StartChannel", null, () => MUS_AudioChannels.forEach(watchAudio));

  document.addEventListener("tokifuru-background-blend", ev => {
    const data = ev.detail;
    log("BG " + data.phase, data.files + " / " + data.seconds + "s / 要求=" +
      data.request + " / " + data.extra);
  });
  document.addEventListener("tokifuru-movie-cover", ev => {
    log("MOVIE COVER " + ev.detail.phase, ev.detail.extra);
  });
  document.addEventListener("tokifuru-ending-roll", ev => {
    log("ED ROLL " + ev.detail.phase, ev.detail.extra);
  });
  document.addEventListener("tokifuru-ending-photo", ev => {
    const data = ev.detail;
    log("ED PHOTO " + data.phase, data.file + " / " + data.extra);
  });
  document.addEventListener("tokifuru-portrait-blend", ev => {
    const data = ev.detail;
    log("CHR " + data.phase, layerLabel(data.layer) + " " + data.files + " / " +
      data.seconds + "s / 要求=" + data.request + " / " + data.extra);
  });
  for (const event of ["transitionstart", "transitionend", "transitioncancel"]) {
    document.getElementById("runtime-stage").addEventListener(event, ev => {
      if (ev.propertyName !== "opacity") return;
      if (ev.target.dataset.backgroundPlane) {
        log("FADE " + event.replace("transition", "").toUpperCase(),
          "L0 背景 " + backgroundSources(ev.target) + " / elapsed=" + ev.elapsedTime.toFixed(3) + "s");
        return;
      }
      if (!/^LAYER[0-3]$/.test(ev.target.id)) return;
      log("FADE " + event.replace("transition", "").toUpperCase(),
        layerLabel(Number(ev.target.id.slice(-1))) + " / elapsed=" + ev.elapsedTime.toFixed(3) + "s");
    });
  }
  // v5.6.17: a rebuilt message-window <img> that is not available in the same
  // frame leaves its layer empty until it loads (seen as the window blinking).
  // MutationObserver runs before rendering, so complete=false here means that
  // the next painted frame lacks this picture.
  const textLabels = { 5: "L5 テキスト枠", 6: "L6 本文", 7: "L7 名前" };
  const textObserver = new MutationObserver(records => {
    for (const record of records) {
      const label = textLabels[record.target.id.slice(-1)];
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const images = node.tagName === "IMG" ? [node] : [...node.querySelectorAll("img")];
        for (const img of images) {
          if (img.complete) continue;
          const file = shortPath(img.getAttribute("src"));
          const started = performance.now();
          log("TEXT WAIT", label + " " + file + " / 画像が未読込（読込まで枠・画像を描けない）");
          const done = ev => log(ev.type === "load" ? "TEXT READY" : "TEXT ERROR", label + " " + file +
            " / 待ち=" + Math.round(performance.now() - started) + "ms");
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }
      }
    }
  });
  for (const num of [5, 6, 7]) {
    textObserver.observe(document.getElementById("LAYER" + num), { childList: true });
  }
  document.addEventListener("keydown", ev => {
    if (ev.key !== "F2") return;
    // Consume before the legacy Number(key) fallback can treat F2 as 0.
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (!ev.repeat) send({ type: "tokifuru-debug-toggle" });
  }, { capture: true });
  window.addEventListener("message", ev => {
    if (ev.origin !== location.origin || ev.source !== window.parent || !ev.data ||
        ev.data.type !== "tokifuru-debug-visible") return;
    active = ev.data.visible === true;
    clearInterval(stateTimer);
    if (active) {
      flush();
      stateTimer = setInterval(flush, 250);
    }
  });
  window.addEventListener("error", ev => {
    const target = ev.target;
    if (target && target !== window) log("RESOURCE ERROR", shortPath(target.src || target.href));
    else log("ERROR", ev.message + " / " + shortPath(ev.filename) + ":" + ev.lineno);
  }, { capture: true });
  window.addEventListener("unhandledrejection", ev => {
    log("ERROR", String(ev.reason && ev.reason.message || ev.reason));
  });
  window.addEventListener("pagehide", () => { clearInterval(stateTimer); flush(); });
  send({ type: "tokifuru-debug-ready" });
  log("DEBUG", "本編ログ開始 / mode=" + (new URLSearchParams(location.search).get("mode") || "new"));
})();
