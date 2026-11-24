/* =========================================================================
   SoulSync — api/_lib/pi.js
   Shared helpers for the Pi Network platform API.
   (A folder whose name starts with "_" is not turned into a route by Vercel,
   so this file is import-only.)

   The API key lives only here, on the server, in PI_API_KEY. It is never sent
   to the browser and never echoed in a response.
   ========================================================================= */
"use strict";

const PI_API_BASE = "https://api.minepi.com/v2";
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_ID_LENGTH = 200;

/* The capability probe pi-adapter.js sends before it opens a payment sheet. */
const PROBE = "soulsync-capability-check";

function apiKey() {
  return String(process.env.PI_API_KEY || "").trim();
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(body);
}

/* Only POST carries a payment; anything else (a browser typing the URL, a
   crawler) gets a clear JSON answer instead of a parse error. */
function requirePost(req, res) {
  if (req.method === "POST") return true;
  res.setHeader("Allow", "POST");
  sendJson(res, 405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  return false;
}

async function readJson(req) {
  const raw = req && req.body;
  if (raw && typeof raw === "object" && !Buffer.isBuffer(raw)) return raw;
  if (typeof raw === "string") return parse(raw);
  if (Buffer.isBuffer(raw)) return parse(raw.toString("utf8"));
  // No parsed body (a runtime that leaves the stream to us).
  if (!req || typeof req[Symbol.asyncIterator] !== "function") return {};
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return parse(Buffer.concat(chunks).toString("utf8"));
}

function parse(text) {
  if (!text) return {};
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value : {};
  } catch (err) {
    return {};
  }
}

function paymentIdOf(body) {
  const id = body && body.paymentId;
  if (typeof id !== "string") return "";
  const trimmed = id.trim();
  if (!trimmed || trimmed.length > MAX_ID_LENGTH) return "";
  return trimmed;
}

function txidOf(body) {
  const txid = body && body.txid;
  if (typeof txid !== "string") return "";
  const trimmed = txid.trim();
  if (!trimmed || trimmed.length > MAX_ID_LENGTH) return "";
  return trimmed;
}

/**
 * One call to the Pi platform API with the app's key.
 * Never throws: a network failure comes back as { status: 0, error }.
 * @returns {Promise<{status:number, ok:boolean, data:*, error?:string}>}
 */
async function piRequest(method, path, key, payload) {
  if (typeof fetch !== "function") {
    return { status: 0, ok: false, data: null, error: "fetch_unavailable" };
  }
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = setTimeout(() => {
    if (controller) {
      try { controller.abort(); } catch (err) { /* ignore */ }
    }
  }, UPSTREAM_TIMEOUT_MS);

  try {
    const init = {
      method,
      headers: {
        Authorization: "Key " + key,
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    };
    if (payload !== undefined) init.body = JSON.stringify(payload);
    if (controller) init.signal = controller.signal;

    const res = await fetch(PI_API_BASE + path, init);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      data = { raw: text.slice(0, 400) };
    }
    return { status: res.status, ok: res.ok, data };
  } catch (err) {
    const name = err && err.name;
    return {
      status: 0,
      ok: false,
      data: null,
      error: name === "AbortError" ? "timeout" : (err && err.message) || "request_failed"
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrap a handler so an unexpected throw still answers with JSON instead of
 * Vercel's HTML error page (which pi-adapter would read as "no backend").
 */
function handler(fn) {
  return async function (req, res) {
    try {
      await fn(req, res);
    } catch (err) {
      console.error("[api/pi] " + ((err && err.stack) || err));
      if (!res.headersSent) sendJson(res, 500, { ok: false, error: "INTERNAL_ERROR" });
    }
  };
}

module.exports = {
  PROBE,
  PI_API_BASE,
  apiKey,
  sendJson,
  requirePost,
  readJson,
  paymentIdOf,
  txidOf,
  piRequest,
  handler
};
