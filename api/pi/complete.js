/* =========================================================================
   SoulSync — POST /api/pi/complete
   After the pioneer signs the payment in the Pi wallet, the app must complete
   it server-side with the blockchain transaction id.

     POST /api/pi/complete   { paymentId, txid }  → 200 { ok: true, ... }

   Without PI_API_KEY this route answers 501 (PI_API_KEY_NOT_CONFIGURED),
   which pi-adapter.js counts as "no server" — the demo path never calls it.
   ========================================================================= */
"use strict";

const {
  apiKey,
  sendJson,
  requirePost,
  readJson,
  paymentIdOf,
  txidOf,
  piRequest,
  handler
} = require("../_lib/pi");

module.exports = handler(async function (req, res) {
  if (!requirePost(req, res)) return;

  const key = apiKey();
  if (!key) {
    return sendJson(res, 501, { ok: false, error: "PI_API_KEY_NOT_CONFIGURED" });
  }

  const body = await readJson(req);
  const paymentId = paymentIdOf(body);
  if (!paymentId) {
    return sendJson(res, 400, { ok: false, error: "PAYMENT_ID_REQUIRED" });
  }
  const txid = txidOf(body);
  if (!txid) {
    return sendJson(res, 400, { ok: false, error: "TXID_REQUIRED" });
  }

  const upstream = await piRequest(
    "POST",
    "/payments/" + encodeURIComponent(paymentId) + "/complete",
    key,
    { txid }
  );

  if (upstream.error) {
    return sendJson(res, 502, { ok: false, error: "PI_API_UNREACHABLE", detail: upstream.error });
  }
  if (!upstream.ok) {
    return sendJson(res, 502, {
      ok: false,
      error: "PI_API_COMPLETE_FAILED",
      upstreamStatus: upstream.status,
      upstream: upstream.data
    });
  }

  return sendJson(res, 200, {
    ok: true,
    paymentId,
    completed: true,
    upstreamStatus: upstream.status,
    upstream: upstream.data
  });
});
