/* =========================================================================
   SoulSync — POST /api/pi/approve
   Pi requires the app's server to approve a payment before the pioneer can
   confirm it in the Pi wallet.

     POST /api/pi/approve   { paymentId }   → 200 { ok: true, ... }
     POST /api/pi/approve   { probe: "soulsync-capability-check" }
                                            → 200 { ok: true, configured: true }

   Without PI_API_KEY this route answers 404 with PI_API_KEY_NOT_CONFIGURED.
   pi-adapter.js reads 404/405/501 as "no approval server" and keeps the
   gratitude offering in its honest demo path, so nothing breaks until the key
   is set in the Vercel project (Settings → Environment Variables → PI_API_KEY).
   ========================================================================= */
"use strict";

const {
  PROBE,
  apiKey,
  sendJson,
  requirePost,
  readJson,
  paymentIdOf,
  piRequest,
  handler
} = require("../_lib/pi");

module.exports = handler(async function (req, res) {
  if (!requirePost(req, res)) return;

  const key = apiKey();
  if (!key) {
    return sendJson(res, 404, { ok: false, error: "PI_API_KEY_NOT_CONFIGURED" });
  }

  const body = await readJson(req);

  // Capability probe: the app asks "is a real approval server here?" before it
  // opens a payment sheet. Answer like an API (JSON 200) so the adapter turns
  // real payments on.
  if (body && body.probe === PROBE) {
    return sendJson(res, 200, { ok: true, configured: true, route: "/api/pi/approve" });
  }

  const paymentId = paymentIdOf(body);
  if (!paymentId) {
    return sendJson(res, 400, { ok: false, error: "PAYMENT_ID_REQUIRED" });
  }

  const upstream = await piRequest(
    "POST",
    "/payments/" + encodeURIComponent(paymentId) + "/approve",
    key
  );

  if (upstream.error) {
    return sendJson(res, 502, { ok: false, error: "PI_API_UNREACHABLE", detail: upstream.error });
  }
  if (!upstream.ok) {
    // Answered, but Pi refused (unknown payment, wrong app, expired). Keep the
    // status in the 5xx range so the adapter does not mistake a 404 for a
    // missing route and quietly continue in demo mode.
    return sendJson(res, 502, {
      ok: false,
      error: "PI_API_APPROVE_FAILED",
      upstreamStatus: upstream.status,
      upstream: upstream.data
    });
  }

  return sendJson(res, 200, {
    ok: true,
    paymentId,
    approved: true,
    upstreamStatus: upstream.status,
    upstream: upstream.data
  });
});
