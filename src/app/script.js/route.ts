const SDK_SCRIPT = `
(function (global) {
  "use strict";

  var documentRef = global.document;
  if (!documentRef) return;

  var scripts = documentRef.getElementsByTagName("script");
  var script = scripts[scripts.length - 1];
  var config = {};
  if (script) {
    config.projectId = script.getAttribute("data-project-id");
    config.websiteId = script.getAttribute("data-website-id") || undefined;
    config.apiHost = (script.getAttribute("data-api-host") || "").replace(/\\/$/, "");
  }
  if (!config.projectId) return;

  var apiHost = config.apiHost || global.location.origin;
  var enabled = global.navigator && global.navigator.doNotTrack !== "1";
  var visitorId = null;
  var sessionId = null;

  function randomId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function getVisitorId() {
    if (visitorId) return visitorId;
    try {
      visitorId = global.localStorage.getItem("ivf_visitor");
      if (!visitorId) {
        visitorId = randomId();
        global.localStorage.setItem("ivf_visitor", visitorId);
      }
    } catch (e) {
      visitorId = randomId();
    }
    return visitorId;
  }

  function getSessionId() {
    if (sessionId) return sessionId;
    try {
      sessionId = global.sessionStorage.getItem("ivf_session");
      if (!sessionId) {
        sessionId = randomId();
        global.sessionStorage.setItem("ivf_session", sessionId);
      }
    } catch (e) {
      sessionId = randomId();
    }
    return sessionId;
  }

  function send(payload) {
    if (!enabled) return;
    var body = {
      projectId: config.projectId,
      websiteId: config.websiteId,
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      path: global.location.pathname + global.location.search,
      url: global.location.href,
      title: documentRef.title,
      referrer: documentRef.referrer || undefined,
      language: (global.navigator && global.navigator.language) || undefined,
      screen: global.screen ? global.screen.width + "x" + global.screen.height : undefined,
      timezone: (function () {
        try {
          return global.Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
          return undefined;
        }
      })(),
      userAgent: (global.navigator && global.navigator.userAgent) || undefined
    };
    for (var key in payload) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        body[key] = payload[key];
      }
    }
    var url = apiHost + "/api/track";
    if (global.fetch) {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () {});
    } else if (global.navigator && global.navigator.sendBeacon) {
      global.navigator.sendBeacon(url, new global.Blob([JSON.stringify(body)], { type: "application/json" }));
    }
  }

  function trackPageview() {
    send({ type: "pageview" });
  }

  var tracking = {
    track: function (name, properties) {
      send({
        type: "event",
        name: String(name || "event"),
        properties: properties || {}
      });
    },
    pageview: trackPageview
  };

  global.analytics = tracking;

  if (documentRef.readyState === "complete" || documentRef.readyState === "interactive") {
    trackPageview();
  } else {
    documentRef.addEventListener("DOMContentLoaded", trackPageview, { once: true });
  }

  var originalPushState = history.pushState;
  if (originalPushState) {
    history.pushState = function () {
      var result = originalPushState.apply(this, arguments);
      global.setTimeout(trackPageview, 300);
      return result;
    };
    global.addEventListener("popstate", function () {
      global.setTimeout(trackPageview, 300);
    });
  }
})(window);
`;

export async function GET() {
  return new Response(SDK_SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
