"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const code = fs.readFileSync(path.join(__dirname, "..", "js", "main.js"), "utf8");

function harness(address, referrer = "") {
  const loc = new URL(address);
  const storage = new Map();
  const listeners = {};
  const emitted = [];
  const document = {
    referrer,
    addEventListener(name, listener) { listeners[name] = listener; },
    dispatchEvent(event) { emitted.push(event); }
  };
  const window = {
    location: { pathname: loc.pathname, hostname: loc.hostname, search: loc.search }
  };
  const sandbox = {
    document,
    window,
    URL,
    URLSearchParams,
    CustomEvent: class {
      constructor(type, init) { this.type = type; this.detail = init.detail; }
    },
    sessionStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "main.js" });
  return { sandbox, storage, listeners, emitted };
}

test("direct visits are classified without identifiers", () => {
  const { sandbox } = harness("https://localboost-zs.ch/kontakt/?email=private%40example.com");
  const data = sandbox.lbLeadAttribution();
  assert.equal(data.source, "direct");
  assert.equal(data.medium, "none");
  assert.equal(data.landing_path, "/kontakt/");
  assert.equal(JSON.stringify(data).includes("private"), false);
});

test("Google referrer is organic; full referrer and search query are discarded", () => {
  const { sandbox, storage } = harness("https://localboost-zs.ch/googlecheck/", "https://www.google.ch/search?q=secret+query");
  const data = sandbox.lbLeadAttribution();
  assert.equal(data.source, "google");
  assert.equal(data.medium, "organic");
  assert.equal(data.channel, "organic");
  assert.equal([...storage.values()].join("").includes("secret"), false);
});

test("UTM data persists for the browser tab but does not store click IDs", () => {
  const { sandbox, storage } = harness("https://localboost-zs.ch/?utm_source=instagram&utm_medium=social&utm_campaign=november_2026&gclid=SENSITIVE");
  sandbox.lbLeadAttribution();
  sandbox.window.location.pathname = "/anfrage/";
  sandbox.window.location.search = "";
  const data = sandbox.lbLeadAttribution();
  assert.equal(data.source, "instagram");
  assert.equal(data.landing_path, "/");
  assert.equal(data.campaign, "november_2026");
  assert.equal([...storage.values()].join("").includes("SENSITIVE"), false);
});

test("malformed campaign parameters are rejected", () => {
  const { sandbox } = harness("https://localboost-zs.ch/kontakt/?utm_source=someone%40example.com");
  assert.equal(sandbox.lbLeadAttribution().source, "direct");
});

test("form metadata contains attribution and page path, never personal fields", () => {
  const { sandbox } = harness("https://localboost-zs.ch/anfrage/?utm_source=google&utm_medium=cpc&utm_campaign=winter");
  const fields = {};
  sandbox.lbEnrichFormData({ set(key, value) { fields[key] = value; } });
  assert.equal(fields.lb_source, "google");
  assert.equal(fields.lb_medium, "cpc");
  assert.equal(fields.lb_channel, "paid");
  assert.equal(fields.lb_form, "anfrage");
  assert.equal(fields.lb_conversion_path, "/anfrage/");
  assert.equal(Object.keys(fields).length, 7);
});

test("contact clicks emit local events without enabling a network analytics sink", () => {
  const { sandbox, listeners, emitted } = harness("https://localboost-zs.ch/");
  sandbox.initConversionTracking();
  listeners.click({
    target: {
      closest() { return { getAttribute() { return "https://wa.me/41778047490"; } }; }
    }
  });
  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].type, "localboost:conversion");
  assert.equal(emitted[0].detail.type, "whatsapp_click");
  assert.equal(emitted[0].detail.channel, "direct");
});
