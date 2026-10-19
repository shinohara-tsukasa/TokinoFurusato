// Demo 5: modern port of original roll.htm + creditp.js.
// credits_legacy_utf8.js supplies the original stafff/staffs arrays.

const TOKIFURU_ENDING_CONFIG = {
    1:  { base:"black", staff:"f", song:0, rollmode:false,
          tm1:[-480,500,1200,1800,2600,3400,4200,9999],
          tm2:["ed01","ed02","ed03","ed04","ed05","ed06","ed07",""] },
    2:  { base:"black", staff:"f", song:1, rollmode:false,
          tm1:[-480,500,1200,1800,2600,3400,4200,9999],
          tm2:["ed01","ed02","ed03","ed04","ed05","ed06","ed07",""] },
    3:  { base:"white", staff:"f", song:2, rollmode:false,
          tm1:[-480,500,1000,1500,2000,2500,3100,3700,4300,9999],
          tm2:["ed21","ed22","ed23","ed24","ed25","ed26","ed27","ed28","ed29",""] },
    11: { base:"white", staff:"s", song:3, rollmode:true,
          tm1:[-480,-150,100,400,800,1200,1600,2000,2400,2800,3200,3450,3850,4350,9999],
          tm2:["edb11","edb12","edb13","edb14","edb15","edb16","edb17","edb18","edb19","edb1a","edb1b","edb1c","edb1d","edb1e",""] },
    12: { base:"black", staff:"s", song:4, rollmode:false,
          tm1:[-480,500,1500,2500,3500,4400,9999],
          tm2:["edb21","edb22","edb23","edb24","edb25","edb26",""] },
    13: { base:"black", staff:"s", song:4, rollmode:false,
          tm1:[-480,500,1400,2300,3200,4100,9999],
          tm2:["edb31","edb32","edb33","edb34","edb35","edb36",""] },
    14: { base:"black", staff:"s", song:4, rollmode:false,
          tm1:[-480,500,1500,2500,3200,4400,9999],
          tm2:["edb41","edb42","edb43","edb44","edb45","edb46",""] },
    15: { base:"black", staff:"s", song:4, rollmode:false,
          tm1:[-480,500,1400,2300,3200,4100,9999],
          tm2:["edb51","edb52","edb53","edb54","edb55","edb56",""] },
    16: { base:"black", staff:"s", song:4, rollmode:false,
          tm1:[-480,500,1400,2300,3200,4100,9999],
          tm2:["edb61","edb62","edb63","edb64","edb65","edb66",""] }
};

// Original creditp.js, milliseconds.
const TOKIFURU_ENDING_SONGTIME = [101907,236273,167992,255587,194546];

let Demo5Ending = null;

function Demo5BuildCredits(staff) {
    let out = "<div class='ending-credit-inner'>";
    let mode = 16;
    let ysize = 0;

    for (let i=0; i<staff.length; i++) {
        const str = staff[i];
        if (str === "") break;
        const a = str.charAt(0);

        if (a === "@") {
            const b = str.charAt(1);
            mode = b==="1" ? 32 : b==="2" ? 24 : 16;
            out += `<span class="ending-credit-text" style="font-size:${mode}px">`;
            continue;
        }

        if (a === "*") {
            const b = str.charAt(1);
            let gap = 0;
            if (b==="1") gap=240;
            if (b==="2") gap=60;
            if (b==="3") gap=140;
            if (b==="4") gap=20;

            if (b==="5") {
                out += "<br>";
                ysize += mode;
            } else {
                out += `</span><br><span class="ending-credit-gap" style="height:${gap}px"></span>`;
                ysize += mode + gap;
            }
            continue;
        }

        out += Demo5EscapeHTML(str);
        ysize += mode;
    }

    out += "</div>";
    return {html:out, ysize};
}

function Demo5EscapeHTML(s) {
    return String(s)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;");
}

// v5.6.18: the first still fades in from the roll's base colour (as before);
// every later still cross-fades from the picture on screen. The old still
// stays underneath at its current opacity until the new one is fully opaque.
// Previously the old still was set to opacity 0 and replaced 30 ms later, so
// the 2-second transition never became visible after the first picture.
const DEMO5_PHOTO_FADE_SECONDS = 2;
let Demo5PhotoToken = 0;

function Demo5PhotoSignal(phase, name, extra) {
    document.dispatchEvent(new CustomEvent("tokifuru-ending-photo", {
        detail: { phase, file: name ? "bg/" + name + ".jpg" : "", extra: extra || "" }
    }));
}

// v5.6.20: resting place of the last credit line. The bottom fade starts at
// y=428 (#ending-shadow-bottom), so the final credit stops just above it.
const DEMO5_ROLL_REST_BOTTOM = 420;

function Demo5RollSignal(phase, extra) {
    document.dispatchEvent(new CustomEvent("tokifuru-ending-roll", { detail: { phase, extra: extra || "" } }));
}

// Bottom of the last visible credit text, relative to the top of the list.
function Demo5LastCreditBottom(list) {
    const walker = document.createTreeWalker(list, NodeFilter.SHOW_TEXT,
        { acceptNode: node => node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    let last = null;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) last = node;
    if (!last) return null;
    const range = document.createRange();
    range.selectNodeContents(last);
    const rects = [...range.getClientRects()].filter(rect => rect.height > 0);
    if (!rects.length) return null;
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    return bottom - list.getBoundingClientRect().top;
}

function Demo5ClearPhotoUnderlays() {
    for (const under of document.querySelectorAll("#ending-host .ending-photo-under")) under.remove();
}

function Demo5SetEndingPhoto(name) {
    const photo = document.getElementById("ending-photo");
    if (!photo || !name || !Demo5Ending) return;

    const token = ++Demo5PhotoToken;
    const next = new Image();
    next.src = "../bg/" + name + ".jpg";
    Demo5PhotoSignal("WAIT", name, "読込・デコード待ち（表示中の画像を保持）");
    const ready = typeof next.decode === "function" ? next.decode() :
        new Promise((resolve, reject) => { next.onload = resolve; next.onerror = reject; });

    ready.catch(() => {}).then(() => {
        const st = Demo5Ending;
        // A newer still or the end of the roll supersedes this request.
        if (!st || token !== Demo5PhotoToken) return;
        if (!next.naturalWidth) {
            Demo5PhotoSignal("ERROR", name, "読込失敗（表示中の画像を保持）");
            return;
        }
        const shown = photo.getAttribute("src") ? Number(getComputedStyle(photo).opacity) : 0;
        if (shown > 0) {
            // Freeze the picture on screen beneath the incoming still. During
            // an unfinished cross-fade the earlier underlay stays too, so the
            // visible composite is preserved exactly.
            const under = document.createElement("img");
            under.className = "ending-photo-under";
            under.alt = "";
            under.src = photo.src;
            under.style.opacity = String(shown);
            photo.before(under);
        }
        clearTimeout(st.photoTimer);
        photo.style.transition = "none";
        photo.style.opacity = "0";
        photo.src = next.src;
        void photo.offsetWidth;
        photo.style.transition = "opacity " + DEMO5_PHOTO_FADE_SECONDS + "s linear";
        photo.style.opacity = "1";
        Demo5PhotoSignal("START", name, (shown > 0 ? "前の画像からクロスフェード" : "地の色からフェードイン") +
            " / " + DEMO5_PHOTO_FADE_SECONDS + "s");
        st.photoTimer = setTimeout(() => {
            if (Demo5Ending !== st || token !== Demo5PhotoToken) return;
            Demo5ClearPhotoUnderlays();
            Demo5PhotoSignal("END", name, "新しい画像100%、前の画像を解放");
        }, DEMO5_PHOTO_FADE_SECONDS * 1000 + 50);
    });
}

function Demo5StartEnding(num) {
    num = Number(num);
    const cfg = TOKIFURU_ENDING_CONFIG[num];
    if (!cfg) {
        console.error("Unsupported ending roll:", num);
        Title();
        return;
    }

    KidSave();
    HideAll();
    sts_skip = false;
    sts_mode = "ending";

    const host = document.getElementById("ending-host");
    const list = document.getElementById("ending-credit-list");
    const photo = document.getElementById("ending-photo");
    const mask = document.getElementById("ending-mask");
    const topShadow = document.getElementById("ending-shadow-top");
    const bottomShadow = document.getElementById("ending-shadow-bottom");

    const isWhite = cfg.base === "white";
    const baseColor = isWhite ? "#fff" : "#000";
    const textColor = isWhite ? "#000" : "#fff";
    const staff = cfg.staff === "s" ? staffs : stafff;
    const built = Demo5BuildCredits(staff);

    host.style.background = baseColor;
    host.hidden = false;

    // The ED-title transition shield sits below this host (z94 vs z95).
    // Keep it through the current compositing turn, then remove it only after
    // the ending host is guaranteed to exist as the next visual surface.
    const transitionShield = document.getElementById("ending-transition-shield");
    if (transitionShield) {
        requestAnimationFrame(() => {
            transitionShield.hidden = true;
        });
    }

    list.innerHTML = built.html;
    list.style.color = textColor;
    list.style.top = "480px";

    Demo5PhotoToken++;
    Demo5ClearPhotoUnderlays();
    photo.removeAttribute("src");
    photo.style.transition = "none";
    photo.style.opacity = "0";

    topShadow.style.background =
        `linear-gradient(to bottom, ${baseColor} 0%, ${baseColor} 15%, transparent 100%)`;
    bottomShadow.style.background =
        `linear-gradient(to bottom, transparent 0%, ${baseColor} 85%, ${baseColor} 100%)`;

    mask.style.background = baseColor;
    mask.style.opacity = "0";
    mask.style.transition = "none";
    mask.hidden = false;

    const songLength100ms = Math.floor(TOKIFURU_ENDING_SONGTIME[cfg.song] / 100);
    // Original creditp.js: endpos = -ysize + 920. ysize is the original
    // height estimate; this page's line metrics differ from it, so the final
    // credit ("Pleiades Company") came to rest inside the bottom fade
    // (main-story rolls: about y=441-483). v5.6.20 keeps the scroll speed
    // (still derived from ysize) and the photo thresholds, and only stops the
    // roll when the last credit's bottom reaches DEMO5_ROLL_REST_BOTTOM.
    const originalEndpos = (built.ysize * -1) + 920;
    const lastBottom = Demo5LastCreditBottom(list);
    const endpos = lastBottom === null ? originalEndpos : DEMO5_ROLL_REST_BOTTOM - lastBottom;
    Demo5RollSignal("REST", (lastBottom === null ? "最後のクレジットを測れないため原作式の停止位置" :
        "最後のクレジットの下端をy=" + DEMO5_ROLL_REST_BOTTOM + "で停止") +
        " / 停止位置 top=" + Math.round(endpos) + "（原作式 " + originalEndpos + "）");

    Demo5Ending = {
        num,
        cfg,
        ysize:built.ysize,
        songLength100ms,
        endpos,
        start:performance.now(),
        cnt:0,
        raf:0,
        stopped:false,
        stopping:false
    };

    // Prewarm all ending stills without changing roll timing.
    for (const imageName of cfg.tm2) {
        if (!imageName) continue;
        const im = new Image();
        im.src = "../bg/" + imageName + ".jpg";
    }
    if (cfg.rollmode) {
        const im = new Image();
        im.src = "../bg/edb1f.jpg";
    }

    Demo3SetStatus("ENDING " + num);
    Demo5EndingTick(performance.now());
}

function Demo5EndingTick(now) {
    const st = Demo5Ending;
    if (!st || st.stopped || st.stopping) return;

    const elapsed100ms = Math.floor((now - st.start) / 100);
    const perc = elapsed100ms / st.songLength100ms;
    const yy = 480 - st.ysize * perc;

    const list = document.getElementById("ending-credit-list");
    list.style.top = yy + "px";

    while (st.cnt < st.cfg.tm1.length) {
        const threshold = st.cfg.tm1[st.cnt] * -1;
        if (!(yy < threshold)) break;

        const name = st.cfg.tm2[st.cnt];
        st.cnt++;
        if (name) Demo5SetEndingPhoto(name);
    }

    // Original creditp.js stopping condition, with endpos measured (v5.6.20).
    if (yy >= st.endpos) {
        st.raf = requestAnimationFrame(Demo5EndingTick);
        return;
    }

    st.stopped = true;
    if (st.cfg.rollmode) Demo5SetEndingPhoto("edb1f");
    Demo3SetStatus("ENDING " + st.num + " / click or key to close");
}

function Demo5EndingInput() {
    const st = Demo5Ending;
    if (!st) return;

    // Original system.js:
    // done==0 -> stoproll()
    // done==1 -> StopEnding()
    if (st.stopping) {
        Demo5FinishEnding();
        return;
    }
    Demo5BeginEndingExit();
}

function Demo5BeginEndingExit() {
    const st = Demo5Ending;
    if (!st || st.stopping) return;
    st.stopping = true;
    if (st.raf) cancelAnimationFrame(st.raf);

    const mask = document.getElementById("ending-mask");
    mask.style.transition = "opacity 3s linear";
    requestAnimationFrame(() => {
        mask.style.opacity = "1";
    });

    st.exitTimer = setTimeout(Demo5FinishEnding, 3050);
}

function Demo5FinishEnding() {
    const st = Demo5Ending;
    if (!st) return;

    if (st.raf) cancelAnimationFrame(st.raf);
    if (st.exitTimer) clearTimeout(st.exitTimer);
    clearTimeout(st.photoTimer);

    // v5.6.18: the roll ends on its base colour (white for ED 3 / ED 11).
    // Keep the ending host on screen, fully masked in that colour, until the
    // parent page replaces this runtime with the title. The title then fades
    // in from the same colour instead of cutting from white to black first.
    const mask = document.getElementById("ending-mask");
    mask.style.transition = "none";
    mask.style.opacity = "1";
    const transitionShield = document.getElementById("ending-transition-shield");
    if (transitionShield) transitionShield.hidden = true;
    Demo5PhotoToken++;
    Demo5ClearPhotoUnderlays();
    document.getElementById("ending-credit-list").innerHTML = "";
    document.getElementById("ending-photo").removeAttribute("src");

    window.Demo5TitleReturnBase = st.cfg.base === "white" ? "#fff" : "";
    Demo5Ending = null;
    sts_mode = "";
    Title();
}

function Demo5StopEnding() {
    Demo5FinishEnding();
}
