// Read-only F2 console. This module never changes saves, clear flags or playback.
(() => {
  "use strict";
  const LIMIT = 600;
  const frame = document.getElementById("runtime-frame");
  const params = new URLSearchParams(location.search);
  const panel = document.createElement("aside");
  panel.id = "toki-debug-console";
  panel.hidden = true;
  panel.setAttribute("aria-label", "デバッグ情報");
  panel.innerHTML =
    '<header><strong>DEBUG LOG / F2</strong>' +
    '<button type="button" data-debug="copy">コピー</button>' +
    '<button type="button" data-debug="clear">ログ消去</button>' +
    '<button type="button" data-debug="close">閉じる</button></header>' +
    '<div class="toki-debug-note">F2：表示切替 ／ 直近600行 ／ 表示中もゲームは進行します</div>' +
    '<pre id="toki-debug-state" tabindex="0" aria-label="現在のデータ"></pre>' +
    '<pre id="toki-debug-log" tabindex="0" aria-label="イベントログ"></pre>' +
    '<textarea id="toki-debug-copy" readonly hidden aria-label="コピー用ログ"></textarea>';
  document.body.appendChild(panel);

  const stateView = panel.querySelector("#toki-debug-state");
  const logView = panel.querySelector("#toki-debug-log");
  const copyView = panel.querySelector("#toki-debug-copy");
  const copyButton = panel.querySelector('[data-debug="copy"]');
  const watchedAudio = new WeakSet();
  const shellAudio = [];
  let records = [], runtimeState = "", lastScreen = "", previousFocus = null;
  let renderFrame = 0, refreshTimer = 0, copyTimer = 0;
  let logVersion = 0, renderedVersion = -1;

  function shortPath(value) {
    if (!value) return "なし";
    try { return decodeURI(new URL(value, location.href).pathname).replace(/^\//, ""); }
    catch (e) { return String(value); }
  }
  function visible(id) {
    const el = document.getElementById(id);
    return el && !el.hidden && getComputedStyle(el).display !== "none";
  }
  function screenInfo() {
    if (visible("launch-notice")) return ["起動時の案内", ""];
    if (visible("exit-screen")) return ["終了", ""];
    if (visible("omake-screen")) return ["おまけ特典", ""];
    if (visible("runtime-screen")) return ["本編", ""];
    if (visible("game-screen")) {
      const id = visible("title-special") ? "title-special-panel" : "title-background";
      return [id === "title-background" ? "タイトル" : "タイトル内メニュー", backgroundPath(id)];
    }
    return ["起動メニュー", backgroundPath("boot-screen")];
  }
  function backgroundPath(id) {
    const value = getComputedStyle(document.getElementById(id)).backgroundImage;
    const match = value.match(/url\(["']?(.*?)["']?\)/);
    return match ? shortPath(match[1]) : "なし";
  }
  function audioState(audio) {
    if (audio.error) return "読込エラー " + audio.error.code;
    if (audio.ended) return "終了";
    if (audio.paused) return "停止中";
    return audio.readyState < 3 ? "データ待ち" : "再生中";
  }
  function stateText() {
    const screen = screenInfo();
    const lines = [
      "起動：" + (params.get("debug") === "1" ? "DEBUG版（既存の全解放あり）" :
        params.get("title") === "yukata" ? "浴衣タイトル版" : "通常版"),
      "画面：" + screen[0]
    ];
    if (screen[1]) lines.push("背景：" + screen[1]);
    if (screen[0] === "タイトル") {
      const title = document.getElementById("game-screen");
      const background = document.getElementById("title-background");
      const ui = document.getElementById("game-ui");
      lines.push("タイトル処理=" + (title.dataset.titleFadeState || "idle") +
        " / fade=" + (title.dataset.titleFadeSeconds || "0") + "s");
      lines.push("背景opacity=" + Number(getComputedStyle(background).opacity).toFixed(2) +
        " / メニューopacity=" + Number(getComputedStyle(ui).opacity).toFixed(2));
    }
    if (screen[0] === "本編") lines.push(runtimeState || "本編データを待っています…");
    const audio = shellAudio.filter(item => !item.audio.paused || item.audio.error);
    for (const item of audio) {
      lines.push("メニュー音声：" + shortPath(item.audio.currentSrc || item.audio.src) +
        " / " + audioState(item.audio));
    }
    if (typeof MUS_AudioChannels !== "undefined") {
      for (const [channel, track] of MUS_AudioChannels.entries()) {
        if (track && track.src && (!track.paused || track.error)) {
          lines.push("音楽鑑賞 CH" + channel + "：" + shortPath(track.currentSrc || track.src) +
            " / " + audioState(track));
        }
      }
    }
    return lines.join("\n");
  }
  function format(record) {
    const time = new Date(record.time);
    const stamp = [time.getHours(), time.getMinutes(), time.getSeconds()]
      .map(n => String(n).padStart(2, "0")).join(":") + "." +
      String(time.getMilliseconds()).padStart(3, "0");
    return "[" + stamp + "] [" + record.kind + "] " +
      (record.where ? record.where + " " : "") + record.message;
  }
  function append(items) {
    if (!items.length) return;
    records.push(...items);
    if (records.length > LIMIT) records.splice(0, records.length - LIMIT);
    logVersion++;
    requestRender();
  }
  function log(kind, message) {
    append([{ time: Date.now(), kind, message: String(message) }]);
  }
  function render() {
    renderFrame = 0;
    if (panel.hidden) return;
    const atBottom = logView.scrollHeight - logView.clientHeight - logView.scrollTop < 32;
    const nextState = stateText();
    if (stateView.textContent !== nextState) stateView.textContent = nextState;
    if (renderedVersion !== logVersion) {
      logView.textContent = records.map(format).join("\n");
      renderedVersion = logVersion;
    }
    if (atBottom) logView.scrollTop = logView.scrollHeight;
  }
  function requestRender() {
    if (!panel.hidden && !renderFrame) renderFrame = requestAnimationFrame(render);
  }
  function notifyRuntime() {
    if (!visible("runtime-screen")) return;
    frame.contentWindow.postMessage({ type: "tokifuru-debug-visible", visible: !panel.hidden }, location.origin);
  }
  function refresh() {
    const screen = screenInfo().join(" / ");
    if (screen !== lastScreen) {
      lastScreen = screen;
      if (!visible("runtime-screen")) runtimeState = "";
      log("SCREEN", screen);
    }
    requestRender();
  }
  function toggle() {
    const hadPanelFocus = panel.contains(document.activeElement);
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      previousFocus = document.activeElement;
      refresh();
      refreshTimer = setInterval(refresh, 250);
    } else {
      clearInterval(refreshTimer);
      copyView.hidden = true;
      if (hadPanelFocus) {
        if (visible("runtime-screen")) frame.contentWindow.focus();
        else if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      }
    }
    notifyRuntime();
  }
  function watchAudio(audio, label, includeInState = true) {
    if (!audio || watchedAudio.has(audio)) return;
    watchedAudio.add(audio);
    if (includeInState) shellAudio.push({ audio, label });
    for (const event of ["playing", "pause", "ended", "error"]) {
      audio.addEventListener(event, () => {
        log("AUDIO", label + " " + shortPath(audio.currentSrc || audio.src) +
          " / " + event + (audio.error ? " code=" + audio.error.code : ""));
      });
    }
  }
  // The music viewer swaps prepared Audio objects into its channels.
  const startChannel = window.MUS_StartChannel;
  if (typeof startChannel === "function") {
    window.MUS_StartChannel = function(...args) {
      const result = startChannel.apply(this, args);
      try {
        MUS_AudioChannels.forEach((audio, channel) => watchAudio(audio, "音楽鑑賞 CH" + channel, false));
      } catch (e) {}
      return result;
    };
  }

  document.addEventListener("keydown", ev => {
    if (ev.key !== "F2") return;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if (!ev.repeat) toggle();
  }, { capture: true });
  // Keys used for selecting/copying/scrolling this panel never reach title shortcuts.
  panel.addEventListener("keydown", ev => ev.stopPropagation());
  panel.addEventListener("contextmenu", ev => ev.stopPropagation());
  panel.querySelector('[data-debug="close"]').addEventListener("click", toggle);
  panel.querySelector('[data-debug="clear"]').addEventListener("click", () => {
    records = [];
    copyView.hidden = true;
    logView.textContent = "";
    log("DEBUG", "ログを消去しました");
  });
  copyButton.addEventListener("click", async () => {
    const text = "時の故郷 v5.6.24 DEBUG\n" + stateText() + "\n\n" + records.map(format).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      copyView.hidden = true;
      copyButton.textContent = "コピー済み";
    } catch (e) {
      copyView.hidden = false;
      copyView.value = text;
      copyView.focus();
      copyView.select();
      copyButton.textContent = "下の欄をCtrl+C";
    }
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => { copyButton.textContent = "コピー"; }, 2500);
  });
  window.addEventListener("message", ev => {
    if (ev.origin !== location.origin || ev.source !== frame.contentWindow || !ev.data ||
        !visible("runtime-screen")) return;
    const data = ev.data;
    if (data.type === "tokifuru-debug-toggle") { toggle(); return; }
    if (data.type === "tokifuru-debug-ready") {
      runtimeState = "";
      notifyRuntime();
      return;
    }
    if (data.type !== "tokifuru-debug-data") return;
    if (Array.isArray(data.records)) append(data.records);
    if (typeof data.state === "string") runtimeState = data.state;
    requestRender();
  });
  frame.addEventListener("load", () => {
    runtimeState = "";
    notifyRuntime();
    requestRender();
  });
  window.addEventListener("error", ev => {
    const target = ev.target;
    if (target && target !== window) log("RESOURCE ERROR", shortPath(target.src || target.href));
    else log("ERROR", ev.message + " / " + shortPath(ev.filename) + ":" + ev.lineno);
  }, { capture: true });
  window.addEventListener("unhandledrejection", ev => {
    log("ERROR", String(ev.reason && ev.reason.message || ev.reason));
  });
  document.addEventListener("tokifuru-launch-notice", ev => {
    log("LAUNCH " + ev.detail.phase, ev.detail.detail);
  });
  document.addEventListener("tokifuru-title-fade", ev => {
    const data = ev.detail;
    log("TITLE " + data.phase, shortPath(data.background) + " / " + data.seconds + "s / " + data.reason);
  });
  for (const event of ["transitionstart", "transitionend", "transitioncancel"]) {
    document.addEventListener(event, ev => {
      if (ev.propertyName !== "opacity" ||
          !["boot-ui", "boot-loading", "title-background", "game-ui"].includes(ev.target.id)) return;
      log("FADE " + event.replace("transition", "").toUpperCase(),
        ev.target.id + " / elapsed=" + ev.elapsedTime.toFixed(3) + "s");
    });
  }
  window.TokiDebugConsole = { watchAudio };
  log("DEBUG", "F2ログ開始 / 表示のみ・セーブや進行フラグは操作しません");
})();
