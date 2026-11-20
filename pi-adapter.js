/* =========================================================================
   SoulSync — pi-adapter.js
   One small layer that behaves the same everywhere:
     • In Pi Browser (window.Pi exists)  → real Pi.authenticate / Pi.createPayment
     • In any normal browser             → an honest demo simulation
   Nothing here fakes a blockchain transaction: in demo mode results are marked
   `mode: "demo"` and the UI says so.
   ========================================================================= */
(function (root) {
  "use strict";

  var CONFIG = {
    // Pi SDK version required by the Pi Browser SDK.
    version: "2.0",
    // Keep sandbox=false for production payments (mainnet). Set true while testing.
    sandbox: false,
    // Your backend that approves/completes payments (see README).
    apiBase: "", // "" = same origin
    endpoints: {
      approve: "/api/pi/approve",
      complete: "/api/pi/complete",
      incomplete: "/api/pi/incomplete"
    },
    // Wallet/app memo shown in the Pi payment sheet.
    memoPrefix: "SoulSync gratitude offering",
    // Only fetched inside Pi Browser when the SDK was not injected by the shell.
    sdkUrl: "https://sdk.minepi.com/pi-sdk.js"
  };

  function hasPiSdk() {
    return typeof root.Pi !== "undefined" &&
      typeof root.Pi.authenticate === "function" &&
      typeof root.Pi.createPayment === "function";
  }

  function postJSON(url, body) {
    return root.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error("Server responded " + res.status);
      return res.json().catch(function () { return {}; });
    });
  }

  var adapter = {
    mode: "demo",           // "pi" | "demo"
    config: CONFIG,
    user: null,
    initialized: false,

    isPiBrowser: function () { return hasPiSdk(); },

    /** Detect the environment once at start-up.
     *  @param {Function} [onChange] called if the SDK becomes available later.
     */
    init: function (onChange) {
      this._onChange = typeof onChange === "function" ? onChange : null;
      if (hasPiSdk()) {
        this._enablePi();
        return this.mode;
      }
      this.mode = "demo";
      this.initialized = true;
      // Pi Browser normally injects the SDK. If it did not, load it once so a
      // real Pi session can still start; any failure simply keeps demo mode.
      var ua = (root.navigator && root.navigator.userAgent) || "";
      if (/PiBrowser/i.test(ua)) this._loadSdk();
      return this.mode;
    },

    _enablePi: function () {
      try {
        root.Pi.init({ version: CONFIG.version, sandbox: CONFIG.sandbox });
        this.mode = "pi";
      } catch (err) {
        this.mode = "demo";
      }
      this.initialized = true;
      if (this._onChange) this._onChange(this.mode);
      return this.mode;
    },

    _loadSdk: function () {
      var self = this;
      if (!root.document || this._loading) return;
      this._loading = true;
      var s = root.document.createElement("script");
      s.src = CONFIG.sdkUrl;
      s.onload = function () {
        self._loading = false;
        if (hasPiSdk()) self._enablePi();
      };
      s.onerror = function () {
        self._loading = false;
        self.mode = "demo";
      };
      root.document.head.appendChild(s);
    },

    /** Handle a payment that was interrupted earlier (Pi SDK requirement). */
    onIncompletePaymentFound: function (payment) {
      try {
        postJSON(CONFIG.apiBase + CONFIG.endpoints.incomplete, {
          paymentId: payment && payment.identifier
        });
      } catch (e) { /* non-blocking */ }
    },

    /**
     * Sign in.
     * @returns {Promise<{uid:string, username:string, mode:string, accessToken?:string}>}
     */
    authenticate: function () {
      var self = this;
      if (self.mode === "pi") {
        return root.Pi.authenticate(["username", "payments"], function (payment) {
          self.onIncompletePaymentFound(payment);
        }).then(function (auth) {
          var user = (auth && auth.user) || {};
          self.user = {
            uid: user.uid || "",
            username: user.username || "pioneer",
            mode: "pi",
            accessToken: auth && auth.accessToken
          };
          return self.user;
        });
      }

      // Demo: simulate the shape Pi returns, after a short, visible delay.
      return new Promise(function (resolve) {
        setTimeout(function () {
          self.user = {
            uid: "demo-uid-" + Date.now().toString(36),
            username: "demo_pioneer",
            mode: "demo"
          };
          resolve(self.user);
        }, 650);
      });
    },

    /**
     * Pay a small gratitude offering.
     * @param {{amount:number, memo:string, metadata?:object}} opts
     * @returns {Promise<{identifier:string, txid?:string, amount:number, memo:string, mode:string}>}
     */
    pay: function (opts) {
      var self = this;
      var amount = Number(opts && opts.amount);
      var userMemo = (opts && opts.memo) || "";
      var paymentMemo = CONFIG.memoPrefix + (userMemo ? " · " + userMemo : "");
      if (!isFinite(amount) || amount <= 0) {
        return Promise.reject(new Error("invalid_amount"));
      }

      if (self.mode === "pi") {
        return new Promise(function (resolve, reject) {
          var paymentData = {
            amount: amount,
            memo: paymentMemo,
            metadata: { app: "soulsync", kind: "gratitude", note: userMemo, ts: Date.now() }
          };
          var callbacks = {
            // 1) ask our backend to approve the payment with the Pi API
            onReadyForServerApproval: function (paymentId) {
              postJSON(CONFIG.apiBase + CONFIG.endpoints.approve, { paymentId: paymentId })
                .catch(function (err) { reject(err); });
            },
            // 2) after the user signs in Pi, complete it server-side
            onReadyForServerCompletion: function (paymentId, txid) {
              postJSON(CONFIG.apiBase + CONFIG.endpoints.complete, { paymentId: paymentId, txid: txid })
                .then(function () {
                  resolve({
                    identifier: paymentId,
                    txid: txid,
                    amount: amount,
                    memo: userMemo,
                    mode: "pi"
                  });
                })
                .catch(reject);
            },
            onCancel: function (paymentId) {
              reject(new Error("cancelled:" + paymentId));
            },
            onError: function (error, payment) {
              reject(error || new Error("payment_error:" + (payment && payment.identifier)));
            }
          };
          try {
            root.Pi.createPayment(paymentData, callbacks);
          } catch (err) {
            reject(err);
          }
        });
      }

      // Demo: resolve as a clearly-labelled simulated offering.
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({
            identifier: "demo-pay-" + Date.now().toString(36),
            txid: null,
            amount: amount,
            memo: userMemo,
            mode: "demo"
          });
        }, 900);
      });
    },

    reset: function () {
      this.user = null;
    }
  };

  root.SS_PI = adapter;
  if (typeof module !== "undefined" && module.exports) module.exports = adapter;
})(typeof window !== "undefined" ? window : globalThis);
