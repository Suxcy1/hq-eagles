// // loader.js - simple show/hide API for inline or fullscreen use
// (function () {
//     const BASE = '/component/loader'; // adjust if you place files elsewhere
//     const IMAGEBASE = '/images/favicon_io/halfImage.jpg'; // adjust if you place files elsewhere
//     let container = null;   // the single template root (cloned when used inline)
//     let activeInstance = null; // currently shown element
//     const MIN_SHOW = 250;   // ms to keep visible to avoid flicker

//     // create base template once by fetching loader.html (if present)
//     async function ensureTemplate() {
//         if (container) return container;
//         // Try to fetch the fragment; if failing, create from string fallback
//         try {
//             const res = await fetch(BASE + '/loader.html', { cache: 'no-store' });
//             if (!res.ok) throw new Error('fetch failed');
//             const text = await res.text();
//             const temp = document.createElement('div');
//             temp.innerHTML = text.trim();
//             container = temp.firstElementChild;
//             return container;
//         } catch (e) {
//             // fallback template (minimal)
//             const temp = document.createElement('div');
//             temp.innerHTML = `
//         <div id="eh-loader" class="eh-loader eh-hidden">
//           <div class="eh-inner">
//             <div class="eh-logo-wrap">
//               <img class="eh-logo" src="${IMAGEBASE}" alt="EH">
//               <svg class="eh-ring" viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="50"></circle><circle class="ring" cx="60" cy="60" r="50"></circle></svg>
//             </div>
//             <div class="eh-texts">
//               <h2 class="eh-title">EAGLES HUB</h2>
//               <p class="eh-sub">Connecting People Building Power</p>
//             </div>
//           </div>
//         </div>`;
//             container = temp.firstElementChild;
//             return container;
//         }
//     }

//     // load CSS if not loaded
//     function ensureCSS() {
//         if (!document.querySelector('link[data-eh-loader-css]')) {
//             const l = document.createElement('link');
//             l.rel = 'stylesheet';
//             l.href = BASE + '/loader.css';
//             l.setAttribute('data-eh-loader-css', 'true');
//             document.head.appendChild(l);
//         }
//     }

//     // Show loader
//     // options: { mode: 'fullscreen'|'inline'|'badge', target: Element (for inline), keepMinMs: number }
//     async function show(options = {}) {
//         const opt = Object.assign({ mode: 'fullscreen', target: null, keepMinMs: MIN_SHOW }, options);
//         ensureCSS();
//         const tpl = await ensureTemplate();
//         // clone a fresh node
//         const node = tpl.cloneNode(true);
//         node.classList.remove('eh-hidden');

//         // apply mode classes
//         node.classList.add(opt.mode === 'inline' ? 'eh-inline' : (opt.mode === 'badge' ? 'eh-inline' : 'eh-fullscreen'));
//         if (opt.mode === 'badge') node.classList.add('badge');

//         // attach to DOM
//         if (opt.mode === 'fullscreen' || !opt.target) {
//             document.body.appendChild(node);
//         } else if (opt.mode === 'inline' || opt.mode === 'badge') {
//             // target must be positioned so absolute inset works; fall back to wrapping
//             const target = opt.target;
//             if (!(target instanceof Element)) {
//                 console.warn('Loader.show: inline mode requires a target element. Falling back to fullscreen.');
//                 document.body.appendChild(node);
//             } else {
//                 // ensure target can contain absolutely positioned overlay
//                 const prevPos = getComputedStyle(target).position;
//                 if (prevPos === 'static' || !prevPos) {
//                     target.dataset.__eh_old_pos = prevPos || '';
//                     target.style.position = 'relative';
//                 }
//                 // if badge, append inside target as sibling; badge is smaller
//                 if (opt.mode === 'badge') {
//                     target.appendChild(node);
//                     node.style.position = 'relative';
//                     node.style.inset = 'auto';
//                 } else {
//                     target.appendChild(node);
//                 }
//             }
//         }

//         // store meta
//         activeInstance = { node, shownAt: Date.now(), minMs: opt.keepMinMs, target: opt.target, mode: opt.mode };
//         return node;
//     }

//     // Hide loader
//     async function hide() {
//         if (!activeInstance) return;
//         const inst = activeInstance;
//         const elapsed = Date.now() - inst.shownAt;
//         const wait = Math.max(0, inst.minMs - elapsed);
//         setTimeout(() => {
//             if (!inst.node) return;
//             inst.node.classList.add('eh-hidden');
//             // cleanup after transition
//             setTimeout(() => {
//                 try {
//                     if (inst.node.parentNode) inst.node.parentNode.removeChild(inst.node);
//                 } catch (e) { }
//                 // restore target's position if we changed it
//                 if (inst.target && inst.target.dataset && '__eh_old_pos' in inst.target.dataset) {
//                     const old = inst.target.dataset.__eh_old_pos;
//                     inst.target.style.position = old || '';
//                     delete inst.target.dataset.__eh_old_pos;
//                 }
//                 activeInstance = null;
//             }, 320);
//         }, wait);
//     }

//     // Convenience helper: wrap a promise and show/hide automatically
//     // Usage: await Loader.wrap(fetchData(), {mode:'inline', target:el})
//     async function wrap(promise, options = {}) {
//         show(options);
//         try {
//             const res = await promise;
//             await hide();
//             return res;
//         } catch (err) {
//             await hide();
//             throw err;
//         }
//     }

//     // Expose API
//     window.Loader = {
//         show,
//         hide,
//         wrap
//     };

// })();



// loader.js (improved, idempotent, ref-counted)
(function () {
    const BASE = '/component/loader'; // <-- change if your assets are elsewhere
    const IMAGEBASE = '/images/favicon_io/halfImage.jpg'; // adjust if you place files elsewhere
    const MIN_SHOW_MS_DEFAULT = 200;

    let template = null;
    let activeNode = null;
    let refCount = 0;
    let shownAt = 0;
    let hideTimer = null;

    // load template once (fetch fallback handled)
    async function ensureTemplate() {
        if (template) return template;
        try {
            const res = await fetch(BASE + '/loader.html', { cache: 'no-store' });
            if (!res.ok) throw new Error('loader.html fetch failed');
            const text = await res.text();
            const tmp = document.createElement('div');
            tmp.innerHTML = text.trim();
            template = tmp.firstElementChild;
            return template;
        } catch (e) {
            // fallback inline template (minimal)
            const tmp = document.createElement('div');
            tmp.innerHTML = `
        <div class="eh-loader eh-hidden">
          <div class="eh-inner">
            <div class="eh-logo-wrap">
              <img class="eh-logo" src="${IMAGEBASE}" alt="EH logo">
              <svg class="eh-ring" viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="50"></circle><circle class="ring" cx="60" cy="60" r="50"></circle></svg>
            </div>
            <div class="eh-texts">
              <h2 class="eh-title">EAGLES HUB</h2>
              <p class="eh-sub">Connecting People Building Power</p>
            </div>
          </div>
        </div>`;
            template = tmp.firstElementChild;
            return template;
        }
    }

    function ensureCSS() {
        if (!document.querySelector('link[data-eh-loader-css]')) {
            const l = document.createElement('link');
            l.rel = 'stylesheet';
            l.href = BASE + '/loader.css';
            l.setAttribute('data-eh-loader-css', 'true');
            document.head.appendChild(l);
        }
    }

    // create node and attach to DOM (if not exists)
    async function mountNode(mode = 'fullscreen', target = null) {
        if (activeNode) return activeNode;
        ensureCSS();
        const tpl = await ensureTemplate();
        const node = tpl.cloneNode(true);
        node.classList.remove('eh-hidden');
        node.classList.add(mode === 'inline' ? 'eh-inline' : 'eh-fullscreen');
        if (mode === 'badge') node.classList.add('badge');

        if (mode === 'fullscreen' || !target) {
            document.body.appendChild(node);
        } else {
            // inline: ensure target positioned and append
            if (!(target instanceof Element)) {
                console.warn('Loader: missing valid target for inline mode — falling back to fullscreen.');
                document.body.appendChild(node);
            } else {
                const prev = getComputedStyle(target).position;
                if (prev === 'static' || !prev) {
                    target.dataset.__eh_old_pos = prev || '';
                    target.style.position = 'relative';
                }
                target.appendChild(node);
            }
        }

        activeNode = node;
        return node;
    }

    // internal hide immediate (no refcount checks)
    function doHideImmediate() {
        if (!activeNode) return;
        activeNode.classList.add('eh-hidden');
        // cleanup after transition
        const nodeToRemove = activeNode;
        activeNode = null;
        clearTimeout(hideTimer);
        hideTimer = null;
        setTimeout(() => {
            try { nodeToRemove.parentNode && nodeToRemove.parentNode.removeChild(nodeToRemove); } catch (e) { }
        }, 320);
    }

    // Public API
    async function show(options = {}) {
        // options: { mode: 'fullscreen'|'inline'|'badge', target: Element, minMs: number }
        const opt = Object.assign({ mode: 'fullscreen', target: null, minMs: MIN_SHOW_MS_DEFAULT }, options);

        // If already shown, just increment refCount
        refCount++;
        // If node already exists, just keep shown (and respect minMs)
        if (activeNode) return activeNode;

        // mount and show
        await mountNode(opt.mode, opt.target);
        shownAt = Date.now();

        // clear any pending hide timer (prevents stacking)
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }

        return activeNode;
    }

    async function hide(force = false) {
        // If force=true, immediately clear everything
        if (force) {
            refCount = 0;
            doHideImmediate();
            return;
        }

        // If refCount > 0, decrement; only hide when it reaches 0
        if (refCount > 0) refCount--;
        if (refCount > 0) return; // still someone needs loader

        // enforce minimum show time
        const elapsed = Date.now() - shownAt;
        const wait = Math.max(0, MIN_SHOW_MS_DEFAULT - elapsed);

        // clear any previous hide timer and set a new one
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            doHideImmediate();
        }, wait);
    }

    // wrap a promise: show before, hide when finished (safe stacking)
    async function wrap(promise, options = {}) {
        await show(options);
        try {
            const res = await promise;
            await hide();
            return res;
        } catch (err) {
            await hide();
            throw err;
        }
    }

    // Optional convenience: auto-wrap global fetch calls (uncomment to enable)
    function installAutoFetch() {
        if (!window.fetch || window.__eh_fetch_installed) return;
        const orig = window.fetch;
        window.__eh_fetch_installed = true;
        window.fetch = function (...args) {
            // show loader for any fetch
            show({ mode: 'fullscreen' });
            return orig.apply(this, args).finally(() => hide());
        };
    }

    // Cleanup on page load / pageshow to avoid stuck loader after refresh/back
    window.addEventListener('load', () => {
        // if something left loader shown, clear it
        if (refCount > 0) {
            refCount = 0;
            hide(true); // force hide
        }
    });

    window.addEventListener('pageshow', () => {
        // pageshow fires on back/forward; ensure loader not stuck
        if (refCount > 0) {
            refCount = 0;
            hide(true);
        }
    });

    // Expose API
    window.Loader = {
        show,
        hide,
        wrap,
        installAutoFetch
    };

})();
