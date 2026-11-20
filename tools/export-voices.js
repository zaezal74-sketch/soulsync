#!/usr/bin/env node
/* =========================================================================
   SoulSync — tools/export-voices.js
   Writes the Korean text of every prayer, rosary meditation and 1-minute
   prayer step into one JSON job list, so the audio generator can read the
   exact same words the app shows. No dependencies.

   Run:  node tools/export-voices.js  > tools/voices.json
   ========================================================================= */
"use strict";

const path = require("path");
const DATA = require(path.resolve(__dirname, "..", "data.js"));

/* A trailing period keeps sentences from running together in the voice; the
   prayers already end with one, so only add it when it is missing. */
function sentence(text) {
  const t = String(text || "").trim();
  if (!t) return "";
  return /[.!?…”"』」]$/.test(t) ? t : t + ".";
}

const jobs = [];

Object.keys(DATA.prayers).forEach((kind) => {
  const p = DATA.prayers[kind];
  jobs.push({ file: kind + ".mp3", text: p.text.ko });
});

Object.keys(DATA.mysteries).forEach((key) => {
  DATA.mysteries[key].items.forEach((item, idx) => {
    jobs.push({
      file: key + "-" + idx + ".mp3",
      text: sentence(item.name.ko) + " " + item.meditation.ko
    });
  });
});

function pushMinute(prefix, steps) {
  steps.forEach((step, idx) => {
    jobs.push({ file: prefix + "-" + idx + ".mp3", text: step.text.ko });
  });
}

pushMinute("minute-default", DATA.minute.steps);
Object.keys(DATA.minute.byMood).forEach((key) => {
  pushMinute("minute-" + key, DATA.minute.byMood[key]);
});

process.stdout.write(JSON.stringify(jobs, null, 2) + "\n");
