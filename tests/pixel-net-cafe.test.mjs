import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../pixel-net-cafe/", import.meta.url);
const read = (name) => fs.readFileSync(new URL(name, root), "utf8");
const sources = ["data.js", "core.js", "ui.js", "sim.js", "scene.js"].map((name) => [name, read(name)]);

function storage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { map.set(k, String(v)); },
    removeItem(k) { map.delete(k); },
    clear() { map.clear(); }
  };
}

function baseContext(seed = {}) {
  const ctx = {
    console,
    localStorage: storage(seed),
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    confirm() { return true; }
  };
  ctx.window = { addEventListener() {} };
  return vm.createContext(ctx);
}

function loadInto(ctx, names) {
  for (const name of names) {
    const code = read(name);
    new vm.Script(code, { filename: name }).runInContext(ctx);
  }
}

function fakeDom() {
  const els = new Map();
  function make(id) {
    return {
      id,
      textContent: "",
      innerHTML: "",
      className: "",
      disabled: false,
      dataset: {},
      style: {},
      onclick: null,
      querySelectorAll() { return []; }
    };
  }
  return {
    documentElement: { lang: "zh-CN" },
    getElementById(id) {
      if (!els.has(id)) els.set(id, make(id));
      return els.get(id);
    },
    addEventListener() {},
    _els: els
  };
}

function drawable() {
  const d = {};
  for (const m of ["setStrokeStyle", "setInteractive", "on", "setResolution", "setOrigin", "setAlpha"]) {
    d[m] = () => d;
  }
  d.destroy = () => {};
  return d;
}

function fakePhaser() {
  class Scene {
    constructor() {
      this.children = { removeAll() {} };
      this.scale = { width: 360, height: 440 };
      this.add = {
        rectangle: () => drawable(),
        text: () => drawable(),
        circle: () => drawable()
      };
      this.tweens = { add() {} };
    }
  }
  class Game {
    constructor(config) {
      assert.ok(config.parent, "Phaser game must have a parent");
      const C = config.scene[0];
      const scene = new C();
      scene.create();
      this.scene = scene;
    }
  }
  return { Scene, Game, AUTO: 0, CANVAS: 1, Scale: { RESIZE: 5 } };
}

test("all game JavaScript files parse", () => {
  for (const [name, code] of sources) {
    assert.doesNotThrow(() => new vm.Script(code, { filename: name }), name);
  }
});

test("index loads game scripts in dependency order", () => {
  const html = read("index.html");
  const expected = ["data.js", "core.js", "ui.js", "sim.js", "scene.js"];
  let previous = -1;
  for (const src of expected) {
    const pos = html.indexOf('src="' + src + '"');
    assert.ok(pos > previous, src + " must be present after previous dependency");
    previous = pos;
  }
});

test("fresh run has sane economy and boss targets", () => {
  const ctx = baseContext();
  loadInto(ctx, ["data.js", "core.js"]);
  ctx.s.district = "campus";
  assert.equal(ctx.s.money, 700);
  assert.equal(ctx.s.seats.length, 12);
  assert.equal(ctx.seatCost(), 101);
  assert.equal(ctx.targetForDay(5), 17);
  assert.equal(ctx.targetForDay(10), 20);
  assert.equal(ctx.targetForDay(15), 25);
  assert.ok(ctx.revenueFor("gamer", 2) >= 32);
});

test("v2 save migrates without carrying busy state", () => {
  const old = {
    lang: "en",
    day: 3,
    money: 777,
    rep: 8,
    selected: 2,
    seats: [{ pc: "gaming", busy: true }]
  };
  const ctx = baseContext({ "pixel-net-cafe-save-v2": JSON.stringify(old) });
  loadInto(ctx, ["data.js", "core.js"]);
  assert.equal(ctx.s.lang, "en");
  assert.equal(ctx.s.day, 3);
  assert.equal(ctx.s.money, 777);
  assert.equal(ctx.s.seats[0].pc, "gaming");
  assert.equal(ctx.s.seats[0].busy, false);
  assert.equal(ctx.s.seats[0].condition, 100);
});

test("customer assignment respects PC tier", () => {
  const ctx = baseContext();
  ctx.document = fakeDom();
  loadInto(ctx, ["data.js", "core.js", "ui.js", "sim.js"]);
  ctx.s.seats[0] = { pc: "office", busy: false, condition: 100, customer: null };
  ctx.s.seats[1] = { pc: "gaming", busy: false, condition: 100, customer: null };
  ctx.s.queue = [
    { id: 1, type: "streamer", patience: 5 },
    { id: 2, type: "gamer", patience: 4 }
  ];
  ctx.assignQueue();
  assert.equal(ctx.s.seats[1].busy, true);
  assert.equal(ctx.s.seats[1].customer, "gamer");
  assert.equal(ctx.s.queue.length, 1);
  assert.equal(ctx.s.queue[0].type, "streamer");
});

test("full page boot binds controls and can buy first seat", () => {
  const ctx = baseContext();
  ctx.document = fakeDom();
  ctx.Phaser = fakePhaser();
  loadInto(ctx, ["data.js", "core.js", "ui.js", "sim.js", "scene.js"]);

  for (const id of ["mainBtn", "facilityBtn", "promoBtn", "help", "lang", "reset"]) {
    assert.equal(typeof ctx.document.getElementById(id).onclick, "function", id + " should be bound");
  }

  const before = ctx.s.money;
  ctx.document.getElementById("mainBtn").onclick();
  assert.ok(ctx.s.seats[0], "first seat should be purchased");
  assert.ok(ctx.s.money < before, "purchase should reduce cash");

  const oldLang = ctx.s.lang;
  ctx.document.getElementById("lang").onclick();
  assert.notEqual(ctx.s.lang, oldLang);
});
