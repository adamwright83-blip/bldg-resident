/**
 * HELD viewable-demo shim. Activates ONLY when the URL contains ?demo=1.
 * It lets the HELD prototype run end-to-end with no backend / no auth so the
 * motion ceremonies (Request -> Drawing, Ink -> Clay -> Settle, live order
 * flow) can be watched on any device. It overrides window.fetch to mock the
 * handful of endpoints the prototype calls. Real builds are untouched: with no
 * ?demo=1 flag this script is a no-op.
 */
(function () {
  var params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "1") return;

  // --- Asset path rewriter -------------------------------------------------
  // Component code references images with root-absolute paths like
  // "/held/token-cardetail.png". When the bundle is served from a path prefix
  // (the preview proxy), those resolve to the proxy root and 404. Compute the
  // real base directory from this script's own URL and rewrite /held/ (and any
  // stray /assets/) src/href attributes to sit under that base.
  var BASE = "/";
  try {
    var self =
      document.currentScript ||
      document.querySelector('script[src*="held-demo-shim.js"]');
    if (self && self.src) {
      BASE = self.src.replace(/held-demo-shim\.js.*$/, "");
    }
  } catch (e) {}
  // If we're already at the domain root, no rewriting is needed.
  var NEEDS_REWRITE = !/^https?:\/\/[^/]+\/$/.test(BASE) && BASE !== "/";

  function fixUrl(val) {
    if (typeof val !== "string") return val;
    if (val.indexOf("/held/") === 0) return BASE + val.slice(1);
    if (val.indexOf("/assets/") === 0) return BASE + val.slice(1);
    return val;
  }

  function rewriteEl(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.tagName === "IMG" || el.tagName === "SOURCE") {
      var s = el.getAttribute("src");
      var fixed = fixUrl(s);
      if (fixed !== s) el.setAttribute("src", fixed);
    }
    // inline background-image styles
    var bg = el.style && el.style.backgroundImage;
    if (bg && (bg.indexOf("/held/") !== -1 || bg.indexOf("/assets/") !== -1)) {
      el.style.backgroundImage = bg
        .replace(/url\((['\"]?)\/held\//g, "url($1" + BASE + "held/")
        .replace(/url\((['\"]?)\/assets\//g, "url($1" + BASE + "assets/");
    }
  }

  if (NEEDS_REWRITE) {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === "attributes") {
          rewriteEl(m.target);
        } else {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            rewriteEl(node);
            if (node.querySelectorAll) {
              var imgs = node.querySelectorAll("img, source, [style*='/held/'], [style*='/assets/']");
              for (var k = 0; k < imgs.length; k++) rewriteEl(imgs[k]);
            }
          }
        }
      }
    });
    document.addEventListener("DOMContentLoaded", function () {
      // sweep anything already present, then watch for new nodes
      var all = document.querySelectorAll("img, source, [style*='/held/'], [style*='/assets/']");
      for (var i = 0; i < all.length; i++) rewriteEl(all[i]);
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src", "style"],
      });
    });
    // also start observing immediately for nodes added before DCL
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src", "style"],
      });
    }
  }

  // Onboarding is skipped via the mocked /api/session below (returns
  // authenticated:true), which makes the onboarding flow mark itself complete
  // and jump straight to the app. No storage APIs are used by this shim so it
  // is safe inside the sandboxed preview iframe.

  // Map a free-text request to demo services so the right clay tokens render.
  function parseServices(text) {
    var t = (text || "").toLowerCase();
    var s = [];
    if (/laundry|dry clean|wash.*fold/.test(t)) s.push({ type: "laundry" });
    if (/dog|groom|pet|walk/.test(t)) s.push({ type: "dog_grooming" });
    if (/car|detail|wash/.test(t)) s.push({ type: "car_detail" });
    if (/airport|ride|uber|waymo|lax|lyft/.test(t)) s.push({ type: "airport_ride" });
    if (s.length === 0) s.push({ type: "car_detail" });
    return s;
  }

  var realFetch = window.fetch.bind(window);

  function jsonResponse(body, status) {
    return new Response(JSON.stringify(body), {
      status: status || 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  window.fetch = function (input, init) {
    var url =
      typeof input === "string"
        ? input
        : input && input.url
        ? input.url
        : String(input);

    // 1) Session — always authenticated in demo.
    if (url.indexOf("/api/session") !== -1) {
      return Promise.resolve(jsonResponse({ authenticated: true }));
    }

    // 2) Typed-request parse -> display + parsed services.
    if (url.indexOf("/api/held/text-command") !== -1) {
      var sentText = "";
      try {
        sentText = JSON.parse((init && init.body) || "{}").content || "";
      } catch (e) {}
      var services = parseServices(sentText);
      return Promise.resolve(
        jsonResponse({
          displayRequest: sentText || "Detail my car this afternoon",
          parsedIntent: { services: services },
        })
      );
    }

    // 3) tRPC sendMessage -> successful booking (superjson batch envelope).
    if (url.indexOf("/api/trpc/chat.sendMessage") !== -1) {
      return new Promise(function (resolve) {
        // small simulated latency so the latency-decoupled handoff is visible
        setTimeout(function () {
          resolve(
            jsonResponse([
              {
                result: {
                  data: {
                    json: {
                      content: "Taking custody.",
                      booking: {
                        orderId: 7012,
                        service: "car_detail",
                        date: "2026-06-05",
                        window: "afternoon",
                      },
                    },
                  },
                },
              },
            ])
          );
        }, 180);
      });
    }

    // 4) tRPC saveName -> ok.
    if (url.indexOf("/api/trpc/chat.saveName") !== -1) {
      return Promise.resolve(
        jsonResponse([{ result: { data: { json: { ok: true } } } }])
      );
    }

    // Everything else (assets, fonts, HMR) passes through untouched.
    return realFetch(input, init);
  };

  // tRPC client captured globalThis.fetch at module eval; keep them in sync.
  try {
    globalThis.fetch = window.fetch;
  } catch (e) {}
})();
