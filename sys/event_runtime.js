// Demo 4: Ruffle playback for original event/*.swf.
// All supplied event movies are linear; no external frame-jump compatibility is required.

const TOKIFURU_EVENT_CACHE = new Map();

// These original ending-title SWFs signal completion with a legacy GetURL at
// timeline end instead of stop(). Under Ruffle, URL navigation is denied, so
// they can wrap to frame 1 during the original WaitMovie polling allowance.
// Runtime-only copies contain a final AVM1 stop(); original event/*.swf files
// remain byte-for-byte untouched.
const TOKIFURU_EVENT_TERMINAL_STOP = new Set([
    "80","81","82","83","84","85","86",
    "90","91","92","93","94"
]);

// All ending-title movies.  The shield is a DOM-level guarantee that the
// interval between Ruffle teardown and the ending-roll host becoming visible
// is black, even if a browser/Ruffle compositing frame briefly resurrects the
// movie's first/last texture.
const TOKIFURU_ENDING_TITLE_MOVIES = new Set([
    "70","71","72","73","74","75",
    "80","81","82","83","84","85","86",
    "90","91","92","93","94"
]);

let TokifuruMoviePlayer = null;
let TokifuruMovieToken = 0;
let TokifuruMovieRAF = 0;
let TokifuruMovieActive = null;

async function Demo4PreloadEvents(onProgress) {
    const ids = Object.keys(TOKIFURU_EVENT_MANIFEST);
    let done = 0;

    await Promise.all(ids.map(async id => {
        const info = TOKIFURU_EVENT_MANIFEST[id];
        const base = TOKIFURU_EVENT_TERMINAL_STOP.has(id)
            ? "../event_runtime/"
            : "../event/";
        const response = await fetch(base + info.file, {cache:"no-store"});
        if (!response.ok) {
            throw new Error(`Event SWF load failed: ${info.file} (${response.status})`);
        }
        TOKIFURU_EVENT_CACHE.set(id, await response.arrayBuffer());
        done++;
        if (onProgress) onProgress(done, ids.length, info.file);
    }));
}

function Demo4DestroyMoviePlayer() {
    if (TokifuruMovieRAF) {
        cancelAnimationFrame(TokifuruMovieRAF);
        TokifuruMovieRAF = 0;
    }

    if (TokifuruMoviePlayer) {
        try {
            const api = TokifuruMoviePlayer.ruffle();
            if (api && typeof api.suspend === "function") api.suspend();
        } catch (e) {}
        try { TokifuruMoviePlayer.remove(); } catch (e) {}
    }

    TokifuruMoviePlayer = null;
    TokifuruMovieActive = null;

    const host = document.getElementById("movie-host");
    if (host) {
        host.replaceChildren();
        host.hidden = true;
    }
}

// v5.6.23: picture changes right after a movie.
// Most movies are followed by "#g0 ..." (or another movie) before the next
// text. Removing the Ruffle player used to reveal the scene from BEFORE the
// movie for a moment, and the next background then faded from that stale
// scene. While such a change is pending, the stage stays covered in the
// movie's final colour; the image changes are applied beneath without a fade
// and the cover then fades out like a normal scene change.
// Final colours were measured from the SWFs: 40 ends white, the others black.
const TOKIFURU_MOVIE_END_COLOR = { "40": "#fff" };
const DEMO4_COVER_FADE_SECONDS = 0.6;
let Demo4CoverToken = 0;

function Demo4CoverSignal(phase, extra) {
    document.dispatchEvent(new CustomEvent("tokifuru-movie-cover", { detail: { phase, extra: extra || "" } }));
}

// Do the scenario lines up to the next text / choice change a picture?
// Follows #J (chapter) and #j (anchor) jumps; stops at conditional jumps.
function Demo4PictureChangesNext() {
    let lines = scn, i = Number(SV_Line), hops = 0;
    for (let n = 0; n < 500; n++) {
        if (i >= lines.length) return false;
        const s = String(lines[i] || "").replace(/\r$/, "");
        i++;
        if (s.charAt(0) !== "#") return false;          // text (incl. ?/$ lines) or end marker
        const c = s.charAt(1);
        if (c === "g" || c === "v") return true;
        if (c === "t" || c === "s" || c === "e" || c === "*") return false;
        if ((c === "f" || c === "r") && s.charAt(2) === "?") return false;
        if (c === "J") {
            if (++hops > 3) return false;
            try { lines = (GetData(basepath + "\\sys\\" + parseInt(s.substring(3), 10) + ".dat") + "\n**").split("\n"); }
            catch (e) { return false; }
            i = 0;
            continue;
        }
        if (c === "j") {
            const anchor = parseInt(s.substring(3), 10);
            const k = lines.findIndex(x => /^#a /.test(String(x)) && parseInt(String(x).substring(3), 10) === anchor);
            if (k < 0 || ++hops > 3) return false;
            i = k + 1;
            continue;
        }
    }
    return false;
}

function Demo4MovieCover() {
    let cover = document.getElementById("movie-exit-cover");
    if (!cover) {
        cover = document.createElement("div");
        cover.id = "movie-exit-cover";
        // z-index 3 after LAYER3 in DOM order: above the pictures (LAYER0-3),
        // below the message window (LAYER4+) and the movie host.
        Object.assign(cover.style, { position: "absolute", inset: "0", width: "640px", height: "480px",
            zIndex: "3", pointerEvents: "none", opacity: "1", transition: "none" });
        cover.hidden = true;
        document.getElementById("runtime-stage").appendChild(cover);
    }
    return cover;
}

function Demo4ShowMovieCover(color, movieId) {
    const cover = Demo4MovieCover();
    Demo4CoverToken++;
    cover.style.transition = "none";
    cover.style.background = color;
    cover.style.opacity = "1";
    cover.hidden = false;
    Demo4CoverSignal("SHOW", "movie " + movieId + " の最後の色(" + (color === "#fff" ? "白" : "黒") + ")で覆う / 次の文章までに画像の切替あり");
}

function Demo4HideMovieCover(reason) {
    const cover = document.getElementById("movie-exit-cover");
    if (!cover || cover.hidden) return;
    Demo4CoverToken++;
    cover.hidden = true;
    cover.style.transition = "none";
    cover.style.opacity = "1";
    Demo4CoverSignal("END", reason);
}

function Demo4ReleaseMovieCover() {
    const cover = document.getElementById("movie-exit-cover");
    if (!cover || cover.hidden) return;
    if (sts_movie) { Demo4CoverSignal("KEEP", "次のムービーまで覆いを維持"); return; }
    if (sts_mode === "ending") { Demo4HideMovieCover("エンディングへ"); return; }
    // The scene changes happened while covered: complete them instantly.
    Demo3FinishImageBlends();
    const token = Demo4CoverToken;
    const started = performance.now();
    const ready = () => {
        if (token !== Demo4CoverToken) return;
        const loading = document.getElementById("LAYER0").dataset.backgroundState === "loading" ||
            [1, 2, 3].some(n => String(document.getElementById("LAYER" + n).dataset.portraitState || "").includes("loading"));
        if (loading && performance.now() - started < 1500) { requestAnimationFrame(ready); return; }
        const seconds = CGFSW && !sts_skip && !sts_force_skip && !nowctrl ? DEMO4_COVER_FADE_SECONDS : 0;
        if (seconds <= 0) { Demo4HideMovieCover("即時表示"); return; }
        Demo4CoverSignal("START", "覆いをフェードアウト / " + seconds + "s");
        void cover.offsetWidth;
        cover.style.transition = "opacity " + seconds + "s linear";
        cover.style.opacity = "0";
        setTimeout(() => { if (token === Demo4CoverToken) Demo4HideMovieCover("フェード完了"); }, seconds * 1000 + 50);
    };
    requestAnimationFrame(ready);
}

function Demo4FinishMovie(token, skipped=false) {
    if (!sts_movie || token !== TokifuruMovieToken) return;

    const finishedMovieId = TokifuruMovieActive;
    const endingTransition =
        TOKIFURU_ENDING_TITLE_MOVIES.has(String(finishedMovieId || ""));

    // IMPORTANT:
    // Make black visible before removing/suspending the Ruffle player.
    // This prevents a stale compositor frame (or a looped SWF frame) from
    // becoming visible between ED-title teardown and ending-roll startup.
    if (endingTransition) {
        const shield = document.getElementById("ending-transition-shield");
        if (shield) shield.hidden = false;
    }

    // v5.6.23: cover the stage BEFORE removing the player (see above).
    if (!endingTransition && Demo4PictureChangesNext()) {
        Demo4ShowMovieCover(TOKIFURU_MOVIE_END_COLOR[String(finishedMovieId)] || "#000", finishedMovieId);
    }

    Demo4DestroyMoviePlayer();
    document.getElementById("movie-skip-catcher").hidden = true;

    sts_movie = false;
    sts_mode = "text";

    Demo3SetStatus(
        skipped ? "ムービーをスキップ" :
        "ムービー終了 → シナリオ再開"
    );

    Decode_Script();
    Demo4ReleaseMovieCover();
}

function Demo4StartCompletionClock(id, token) {
    const info = TOKIFURU_EVENT_MANIFEST[id];
    // Original WaitMovie() polled every 100ms, so retain that small
    // post-end delay rather than resuming on the exact final frame.
    const targetMs = info.durationMs + info.resumeDelayMs;

    let elapsed = 0;
    let last = performance.now();

    function tick(now) {
        if (!sts_movie || token !== TokifuruMovieToken) return;

        // requestAnimationFrame pauses/throttles in a hidden tab.  Cap large
        // deltas so a backgrounded game does not instantly skip the movie
        // when the user returns.
        let delta = now - last;
        last = now;
        if (delta < 0) delta = 0;
        if (delta > 100) delta = 100;
        elapsed += delta;

        if (elapsed >= targetMs) {
            Demo4FinishMovie(token, false);
            return;
        }
        TokifuruMovieRAF = requestAnimationFrame(tick);
    }

    TokifuruMovieRAF = requestAnimationFrame(tick);
}

async function Demo4PlayMovie(name) {
    let id = String(parseInt(name, 10)).padStart(2, "0");
    const info = TOKIFURU_EVENT_MANIFEST[id];

    if (!info) {
        console.error("Unknown event movie:", name);
        Demo3SetStatus("未登録ムービー " + name + " → スキップ");
        sts_movie = true;
        sts_mode = "movie";
        const token = ++TokifuruMovieToken;
        setTimeout(() => Demo4FinishMovie(token, true), 0);
        return;
    }

    const swfData = TOKIFURU_EVENT_CACHE.get(id);
    if (!swfData) {
        throw new Error("Event movie is not preloaded: " + info.file);
    }

    Demo4DestroyMoviePlayer();
    const token = ++TokifuruMovieToken;

    sts_mode = "movie";
    sts_movie = true;

    // Original PlayMovie() clears UI layers 4..8 and places a transparent
    // click-to-skip surface above the movie.
    for (let i = 4; i <= 8; i++) WriteLayer(i, "");

    const host = document.getElementById("movie-host");
    const catcher = document.getElementById("movie-skip-catcher");
    host.hidden = false;
    catcher.hidden = false;

    const ruffle = window.RufflePlayer && window.RufflePlayer.newest
        ? window.RufflePlayer.newest()
        : null;
    if (!ruffle) {
        throw new Error("Ruffle is not available");
    }

    const player = ruffle.createPlayer();
    player.id = "EVENT_MOVIE_PLAYER";
    player.style.width = "640px";
    player.style.height = "480px";
    player.style.display = "block";
    player.style.background = "transparent";
    host.replaceChildren(player);
    TokifuruMoviePlayer = player;
    TokifuruMovieActive = id;

    Demo3SetStatus(
        `Movie ${id}: ${info.endFrame + 1} frames @ ${info.fps}fps`
    );

    try {
        // Load fully while suspended. This gives us a defined time zero for
        // the statically-known linear timeline.
        const api = player.ruffle();
        await api.load({
            data: swfData.slice(0),
            swfFileName: info.file,
            autoplay: "off",
            wmode: "transparent",
            contextMenu: false,
            openUrlMode: "deny",
            splashScreen: false,
            preloader: false
        });

        if (!sts_movie || token !== TokifuruMovieToken) return;

        api.resume();
        Demo4StartCompletionClock(id, token);
    } catch (err) {
        console.error("Ruffle event playback failed:", info.file, err);
        Demo3SetStatus("Ruffle再生失敗: " + info.file);
        Demo4FinishMovie(token, true);
    }
}

function Demo4SkipMovie() {
    if (!sts_movie) return;
    Demo4FinishMovie(TokifuruMovieToken, true);
}
