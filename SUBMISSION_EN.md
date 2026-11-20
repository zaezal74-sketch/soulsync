# SoulSync — Pi Next Hackathon 2027 Submission

**Category:** Lifestyle · Faith & Wellbeing
**Platform:** Pi Browser (web app, no build step)
**Tagline:** Faith, heart, and the rhythm of daily life — one small prayer at a time.

---

## 1. Short description (for the listing card)

SoulSync is an AI companion that connects how you feel with how you pray. Choose
your heart for the day and it offers a warm word, a one-minute prayer, and the
Rosary mystery that fits — then quietly keeps the rhythm going with a streak,
a weekly record, and small gratitude offerings in Pi.

---

## 2. What it is

Most prayer apps ask for more than people have on a tired weekday: a long
session, a perfect routine, a guilt-free conscience. SoulSync starts from the
opposite direction.

> The app is not a religious rulebook. It is an **AI heart-care + faith-rhythm
> platform**. "You should" is out; "let me help you" is in. Ten minutes is out;
> **one minute** is in.

The user picks a feeling — tired, anxious, calm, grateful, lonely, joyful — and
the app responds with three small things: one honest sentence, one line of
Scripture, and one action that takes a minute. From there, the Rosary flow opens
with the mystery that matches that feeling, and finishing a single decade (ten
beads) is enough to count as today's prayer.

Everything is bilingual (Korean / English) and switches live, so one build serves
both the Korean community the app was written for and the global Pi community.

---

## 3. Core features

### 3.1 Home — the emotional entry point
- Six feeling chips with an immediate, non-judgmental AI response (not a daily
  quote, but a response to *this* feeling).
- Today's small routine: one short prayer · one Rosary decade · one verse.
- A verse of the day, and two ways in: a guided **one-minute prayer** sheet
  (breathing ring, four stages, 60 seconds) or the Rosary.

### 3.2 Rosary flow
- Full traditional structure: Sign of the Cross, Apostles' Creed, Our Father,
  three Hail Marys, Glory Be, then five decades of (meditation, Our Father,
  10 Hail Marys, Glory Be, Fatima Prayer).
- Real Catholic prayer texts in Korean and English.
- Five-decade progress indicator, ten-bead counter, and the five mysteries of
  the selected set with the current one highlighted.
- Mystery recommendation from today's feeling: tired/anxious → Sorrowful,
  calm → Luminous, grateful/joyful → Joyful, lonely → Glorious.
- Auto-advance with per-prayer pacing, pause, manual bead-by-bead prayer,
  Web Speech voice guidance, gentle Web Audio chimes, and a dark **Focus Mode**
  that hides everything but the prayer.
- Completing a decade writes today's Rosary into the routine and adds one to the
  Global Rosary Solidarity counter.

### 3.3 AI Coach
- Free-text input plus six quick-start chips ("I'm so worn out today",
  "My heart is anxious", "I feel lonely"…).
- The coach reads feeling keywords and answers in a fixed, transparent shape:
  **empathy → one-minute action → a verse → the mystery to pray next**.
- "Pray with me" jumps straight into the Rosary with that mystery selected.
- The response shape is exactly what a server-side LLM would return, so the
  local rule engine can be replaced without touching the UI.
- Past replies re-render in the current language, so switching KR/EN translates
  the whole conversation.

### 3.4 Routine & Pi
- Streak, best streak, last seven days with three coloured dots per day
  (prayer · rosary · verse), today's checklist, and a flow message that changes
  with behaviour — after a gap it says "start again with one minute", never
  "you failed".
- **Pi sign-in** and **gratitude offering** (0.1 / 1 / 3.14 π) with a memo and a
  visible record of recent offerings.
- **Global Rosary Solidarity** counter: Pioneers praying today, plus how many
  times you joined in.
- All state persists in `localStorage`; a reset control clears everything.

---

## 4. Why this belongs on Pi

1. **A global community already exists.** Pi has millions of Pioneers across
   regions where faith is central to daily life — the Philippines, Nigeria,
   Vietnam, Korea, Brazil, Poland. A bilingual, low-friction prayer companion
   reaches them on the device they already use for Pi.
2. **Micro-giving needs micro-payments.** A 1 π gratitude offering, or a small
   donation to a parish or charity, only makes sense where fees do not swallow
   the amount. Pi makes a 0.1 π offering meaningful.
3. **Transparency is the point.** "Transparent giving" is a natural third step
   of the roadmap: every offering recorded openly, verifiable by the community.
4. **Daily return is built in.** A feeling check-in plus a ten-bead decade is a
   two-minute habit. Pi apps win on retention, and this app's loop is short.
5. **Identity that travels.** With Pi sign-in, a user's prayer record is not
   trapped in one phone — it follows the person.

---

## 5. How the Pi integration works

| Step | Implementation |
| --- | --- |
| Environment detect | `pi-adapter.js` checks `window.Pi`. If the SDK was not injected inside Pi Browser, it loads `https://sdk.minepi.com/pi-sdk.js` once. |
| Init | `Pi.init({ version: "2.0", sandbox: CONFIG.sandbox })` |
| Sign in | `Pi.authenticate(["username", "payments"], onIncompletePaymentFound)` → username is shown as `@handle` |
| Offering | `Pi.createPayment({ amount, memo, metadata }, callbacks)` with `onReadyForServerApproval` → `POST /api/pi/approve`, `onReadyForServerCompletion` → `POST /api/pi/complete` |
| Cancellation / errors | `onCancel` and `onError` are surfaced in the UI; nothing is recorded as paid |
| Outside Pi | Demo mode with identical UI flow; every result is labelled `mode: "demo"` and the screen says no real payment occurs |

The approval server is intentionally **not** shipped in this prototype; the
endpoints and a minimal Node/Express reference implementation are documented in
`README.md` §3.3. Payment API keys must live on the server, never in the client.

---

## 6. Try it in three minutes (demo script)

1. Home → tap **Tired**. Read the response; note it suggests one minute, not ten.
2. Tap **Start praying** → the one-minute prayer sheet runs 60 seconds; finish it
   and watch today's routine tick to 1/3.
3. Back home → **Continue with the Rosary**. The Sorrowful Mysteries are already
   selected, the first mystery is highlighted, and the bead counter is at 1/10.
4. Tap **Pray this bead** a few times, then **Auto** to see pacing and the
   progress bar. Turn on **Focus Mode** for the dark meditation UI.
5. Switch to **AI Coach**, tap "I feel lonely" → empathy, action, Psalm 34, and
   **Pray with me**.
6. **Routine & Pi** → sign in with Pi (or demo), choose 3.14 π, add a memo, offer
   it, and watch the Global Rosary Solidarity counter.
7. Press **EN** — the entire app, including prayers and past coach replies,
   switches to English.

---

## 7. Technical notes

- Pure HTML/CSS/JS, no framework, no build step, no external CDN at runtime.
- `rosary.js` is a pure state machine (77 steps) covered by Node unit checks.
- `coach.js` is a keyword/tone classifier over a theme table; deterministic and
  offline, with an LLM-ready response contract.
- `data.js` holds every KR/EN string in one place so translations cannot drift.
- Mobile-first at 430 px, presented inside a phone frame on desktop; safe-area
  padding for notched devices; `prefers-reduced-motion` respected.
- Accessibility: semantic landmarks, `aria-pressed` toggles, keyboard-operable
  checklist items, visible focus rings, `aria-live` status regions.
- Local smoke test: 31 checks (engine maths, rendering, mood → mystery mapping,
  decade recording, KR/EN, coach, Pi demo, 1-minute prayer, persistence, reset).

---

## 8. Privacy Policy (draft)

**Last updated: 20 November 2026**

SoulSync ("the app", "we") is a prayer and daily-routine companion. This draft
covers the prototype submitted to the Pi Next Hackathon. Replace the contact
details at the end before public release.

### 8.1 What we collect
- **Mood check-ins, routine records (prayer / rosary / verse), and coach
  messages** you enter. In this prototype these are stored only in your
  browser's local storage on your device.
- **Your Pi username**, only if you choose "Sign in with Pi". It is used to show
  who is signed in and to attach your record to your Pi identity.
- **Offering records** (amount, optional memo, time) for gratitude offerings you
  make. In demo mode these are simulated and no payment occurs.
- We do **not** collect your name, email, phone number, contacts, location,
  device identifiers, or advertising identifiers.

### 8.2 How we use it
- To show your own prayer history, streak, and weekly record back to you.
- To generate the coach's response on your device from the words you type.
- To display your Pi username and offering history.
- We do not sell your data, do not use it for advertising, and do not use it to
  train third-party models.

### 8.3 Where it is stored
All app data lives in your browser's `localStorage` on your device. If you sign
in with Pi, Pi Network processes that authentication under Pi's own privacy
policy. When real payments are enabled, the Pi Network API processes the payment
and its transaction identifier; our server stores only the payment identifier,
amount, memo, and status needed to complete the payment.

### 8.4 Your choices
- **Reset my data** inside the app deletes all locally stored records immediately.
- Clearing your browser data removes everything as well.
- You can use the app without signing in with Pi (demo mode).

### 8.5 Children
The app is not directed to children under 13. We do not knowingly collect
personal information from children. If you believe a child has provided
information, contact us and we will delete it.

### 8.6 Spiritual care, not medical care
SoulSync offers companionship and prayer suggestions. It is not a medical
device, does not provide diagnosis or treatment, and is not a substitute for
professional mental-health care or the pastoral guidance of your parish. If you
are in crisis, please contact local emergency services or a qualified
professional.

### 8.7 Retention
Local records remain until you delete them. Server-side payment records, when
enabled, are kept only as long as required to reconcile the transaction and to
meet Pi Network requirements.

### 8.8 Changes
If this policy changes materially, we will show a notice in the app before the
change takes effect.

### 8.9 Contact
`[contact email — to be filled before submission]`
`[operator / parish or organisation name — to be filled before submission]`

---

## 9. Roadmap

| Phase | Scope |
| --- | --- |
| **1 — MVP (this build)** | 4 screens, KR/EN, Rosary engine with voice & focus mode, coach, streak record, Pi adapter with demo mode, gratitude offering UI |
| **2 — Growth** | Server LLM coach, recorded prayer voice packs, personalised statistics, homily/doctrine explainers, Pi-synced records |
| **3 — Ecosystem** | Prayer-request community, parish & Mass information, verified transparent giving, Rosary solidarity campaigns across time zones |
| **4 — Sustainability** | Premium AI coaching, voice packs, community features, optional parish partnerships |

---

## 10. How this was built

Designed from the founder's own product brief, then implemented and verified with
an AI assistant: screen structure, bilingual copy, the Rosary state machine, the
coach theme table, and the Pi adapter. All logic runs locally; no generated
content is sent anywhere. The AI coach is deliberately a transparent local rule
engine in this MVP so that judges can see exactly why the app says what it says.

---

## 11. Contact

`[name / handle]` · `[email]` · `[Pi app URL]`
