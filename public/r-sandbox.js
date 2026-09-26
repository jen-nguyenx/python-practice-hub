// The R sandbox: a relay between the app and webR, running in an opaque-origin iframe (r-sandbox.html).
//
// Deliberately thin. Everything about running code -- splitting it into expressions, spotting errors,
// judging tests -- lives in src/runtime/r/driver.ts on the app side and in harness.R, which the verifier
// shares. This file only starts webR and passes console traffic back and forth, so there is nothing here
// for the browser and the verifier to disagree about.
//
// A classic script, not a module: a module script would be fetched with CORS, and this document's origin
// is opaque, so a same-server module would need headers the dev server does not send.
(function () {
  'use strict';

  var WEBR_PREFIX = 'https://cdn.jsdelivr.net/npm/webr@';
  // One more line than the driver keeps, so it can tell that output was cut short.
  var MAX_LINES = 2001;
  var MARK = '\u0001PLERR\u0001';
  var webR = null;
  var booting = null;

  function reply(id, ok, value) {
    parent.postMessage({ plr: 1, id: id, ok: ok, value: value }, '*');
  }

  function boot(base) {
    // The app sends the pinned CDN folder; nothing else is accepted, and the policy blocks it anyway.
    if (typeof base !== 'string' || base.indexOf(WEBR_PREFIX) !== 0 || !/\/dist\/$/.test(base)) {
      return Promise.reject(new Error('refused a webR address that is not the pinned CDN folder'));
    }
    // webr.js is the browser build; webr.mjs is the Node one and imports Node's own modules.
    return import(base + 'webr.js').then(function (mod) {
      webR = new mod.WebR({ baseUrl: base, channelType: mod.ChannelType.PostMessage });
      return webR.init();
    });
  }

  // Every message up to and including the next prompt. Only text crosses back to the app.
  function drain() {
    var out = [];
    var lines = 0;
    function next() {
      return webR.read().then(function (m) {
        if (m.type === 'stdout' || m.type === 'stderr') {
          var text = typeof m.data === 'string' ? m.data : String(m.data);
          if (lines < MAX_LINES || text === MARK) {
            out.push({ type: m.type, data: text });
            lines++;
          }
          return next();
        }
        if (m.type === 'prompt') {
          out.push({ type: 'prompt', data: typeof m.data === 'string' ? m.data : '' });
          return out;
        }
        if (m.type === 'closed') {
          out.push({ type: 'closed', data: '' });
          return out;
        }
        // Graphics and pager messages: the app draws its own pictures, so these are dropped.
        return next();
      });
    }
    return next();
  }

  window.addEventListener('message', function (ev) {
    if (ev.source !== parent) return;
    var m = ev.data;
    if (!m || m.plr !== 1 || typeof m.id !== 'number') return;
    var work;
    if (m.op === 'init') {
      booting = booting || boot(m.base);
      work = booting.then(function () { return null; });
    } else if (!webR) {
      work = Promise.reject(new Error('R has not started'));
    } else if (m.op === 'write' && typeof m.text === 'string') {
      webR.writeConsole(m.text);
      work = Promise.resolve(null);
    } else if (m.op === 'drain') {
      work = drain();
    } else if (m.op === 'eval' && typeof m.code === 'string') {
      work = webR.evalRString(m.code);
    } else if (m.op === 'writeFile' && typeof m.path === 'string' && m.path.indexOf('/tmp/') === 0 && m.bytes instanceof ArrayBuffer) {
      // A pinned package, fetched and hash-checked by the app, handed over as bytes for R to unpack.
      work = webR.FS.writeFile(m.path, new Uint8Array(m.bytes)).then(function () { return null; });
    } else {
      work = Promise.reject(new Error('unknown request'));
    }
    work.then(
      function (value) { reply(m.id, true, value); },
      function (err) { reply(m.id, false, String((err && err.message) || err)); }
    );
  });

  parent.postMessage({ plr: 1, op: 'loaded' }, '*');
})();
