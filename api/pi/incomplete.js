/* =========================================================================
   SoulSync — POST /api/pi/incomplete
   Pi SDK calls onIncompletePaymentFound when a payment was left unfinished in
   an earlier session (app closed between approval and completion). pi-adapter
   forwards the id here so the server has a record of it.

     POST /api/pi/incomplete   { paymentId }  → 200 { ok: true, acknowledged: true }

   Without PI_API_KEY: 501 (PI_API_KEY_NOT_CONFIGURED).

   This route only records and acknowledges: it never charges, completes or
   cancels a payment on its own. An interrupted offering that is never
   completed is not taken from the pioneer's wallet, and the app simply keeps
   its local record.
   ========================================================================= */
"use strict";

const {
  apiKey,
  sendJson,
  requirePost,
  readJson,
  paymentIdOf,
  handler
} = require("../_lib/pi");

module.exports = handler(async function (req, res) {
  if (!requirePost(req, res)) return;

  if (!apiKey()) {
    return sendJson(res, 501, { ok: false, error: "PI_API_KEY_NOT_CONFIGURED" });
  }

  const body = await readJson(req);
  const paymentId = paymentIdOf(body);
  if (!paymentId) {
    return sendJson(res, 400, { ok: false, error: "PAYMENT_ID_REQUIRED" });
  }

  console.warn("[api/pi/incomplete] payment left unfinished: " + paymentId);
  return sendJson(res, 200, { ok: true, acknowledged: true, paymentId });
});
