// v5.6.17: keep the legacy UI pictures resident for the whole runtime.
//
// The original engine rebuilds the message window with innerHTML on every
// line (DrawText -> LAYER5 frame.png / frame0.png, LAYER6 read.png, ...).
// Chrome shows a newly created <img> in the same frame only while the image
// resource is still alive in its memory cache. If nothing references
// frame0.png (because frame.png is on screen), garbage collection may release
// it; the next <img> is then loaded asynchronously and LAYER5 is empty for at
// least one frame, which looks like the message window blinking.
//
// Holding these Image objects keeps every resource referenced, so each
// rebuilt <img> is available synchronously. The engine's HTML, layer order,
// save data and history are not changed.
(() => {
  "use strict";
  // Every sys/ picture that the legacy engine writes through innerHTML.
  // Relative to sys/runtime.html, the same URL as the engine's own <img> tags.
  const FILES = [
    "frame.png", "frame0.png", "read.png", "blank.gif",
    "sel.png", "sel0.png", "sel1.png", "sysmenu.png",
    "hist.png", "black.gif", "on.jpg", "off.jpg"
  ];
  const images = FILES.map(file => {
    const image = new Image();
    image.src = file;
    return image;
  });
  const settle = image => (typeof image.decode === "function" ?
    image.decode() : new Promise((resolve, reject) => {
      if (image.complete) { image.naturalWidth ? resolve() : reject(new Error("load")); return; }
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    })).then(() => true, () => false);

  window.Demo3TextWindowImages = Object.freeze({
    files: FILES.slice(),
    // Exposed only for the F2 view; the references themselves are the fix.
    status() {
      return { loaded: images.filter(image => image.complete && image.naturalWidth > 0).length,
        total: images.length };
    },
    ready: Promise.all(images.map(settle))
  });
})();
