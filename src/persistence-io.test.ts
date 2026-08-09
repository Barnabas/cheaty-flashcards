import { describe, expect, it } from "vite-plus/test";
import { reactive } from "vue";
import { buildProgressExport, parseProgressExport, applyProgressExport } from "./persistence-io";

function sampleStores() {
  return {
    settings: { soundEnabled: false },
    progress: { bests: { add: { percentCorrect: 0.9 } as any } },
    mastery: { families: { "add:3,6,9": { stage: 4 } as any } },
    streak: { current: 3, best: 12 },
    curriculum: { active: { add: ["add:2,2,4", "add:2,3,5"], multiply: [] } },
    wallet: { tokens: 7 },
  };
}

describe("buildProgressExport / parseProgressExport round trip", () => {
  it("serializes and parses back to the same data", () => {
    const stores = sampleStores();
    const exported = buildProgressExport(stores);
    const json = JSON.stringify(exported);
    const parsed = parseProgressExport(json);
    expect(parsed).toEqual(exported);
  });

  it("copies nested objects rather than aliasing the store's own state", () => {
    const stores = sampleStores();
    const exported = buildProgressExport(stores);
    stores.progress.bests["add"].percentCorrect = 0;
    stores.curriculum.active.add.push("add:9,9,18");
    expect(exported.progress.bests["add"]!.percentCorrect).toBe(0.9);
    expect(exported.curriculum.active.add).toEqual(["add:2,2,4", "add:2,3,5"]);
  });

  // The real bug this phase hit: store state is a Vue reactive Proxy in
  // production (plain objects only in the fixtures above), and
  // structuredClone() can't clone a Proxy directly — toRaw() has to unwrap
  // it first. A plain object round-trips through toRaw() as a no-op, so this
  // is the one case that actually exercises that path.
  it("builds an export from reactive (Proxy-wrapped) store state without throwing", () => {
    const stores = {
      settings: reactive({ soundEnabled: true }),
      progress: reactive({ bests: sampleStores().progress.bests }),
      mastery: reactive({ families: sampleStores().mastery.families }),
      streak: reactive({ current: 1, best: 5 }),
      curriculum: reactive({ active: sampleStores().curriculum.active }),
      wallet: reactive({ tokens: 7 }),
    };
    expect(() => buildProgressExport(stores)).not.toThrow();
    expect(buildProgressExport(stores).progress.bests).toEqual(sampleStores().progress.bests);
  });
});

describe("parseProgressExport validation", () => {
  it("rejects invalid JSON", () => {
    expect(() => parseProgressExport("not json")).toThrow();
  });

  it("rejects a well-formed but unrelated JSON object", () => {
    expect(() => parseProgressExport(JSON.stringify({ hello: "world" }))).toThrow();
  });

  it("rejects a mismatched version", () => {
    const exported = buildProgressExport(sampleStores());
    const wrongVersion = { ...exported, version: 99 };
    expect(() => parseProgressExport(JSON.stringify(wrongVersion))).toThrow();
  });

  it("rejects an old v1 export missing the curriculum field", () => {
    const exported = buildProgressExport(sampleStores());
    const { curriculum: _curriculum, ...withoutCurriculum } = exported;
    expect(() => parseProgressExport(JSON.stringify(withoutCurriculum))).toThrow();
  });

  it("rejects an old v2 export missing the wallet field", () => {
    const exported = buildProgressExport(sampleStores());
    const { wallet: _wallet, ...withoutWallet } = exported;
    expect(() => parseProgressExport(JSON.stringify(withoutWallet))).toThrow();
  });

  it("accepts an untampered export", () => {
    const exported = buildProgressExport(sampleStores());
    expect(() => parseProgressExport(JSON.stringify(exported))).not.toThrow();
  });

  it("rejects a file with a boosted score but no matching checksum update", () => {
    const exported = buildProgressExport(sampleStores());
    const tampered = {
      ...exported,
      progress: { bests: { add: { percentCorrect: 1.0 } } },
    };
    expect(() => parseProgressExport(JSON.stringify(tampered))).toThrow(/checksum/i);
  });

  it("rejects a file missing its checksum field entirely", () => {
    const exported = buildProgressExport(sampleStores());
    const { checksum: _checksum, ...withoutChecksum } = exported;
    expect(() => parseProgressExport(JSON.stringify(withoutChecksum))).toThrow();
  });
});

describe("applyProgressExport", () => {
  it("writes every field from the export onto the target stores", () => {
    const source = sampleStores();
    const exported = buildProgressExport(source);
    const target = {
      settings: { soundEnabled: true },
      progress: { bests: {} },
      mastery: { families: {} },
      streak: { current: 0, best: 0 },
      curriculum: { active: { add: [], multiply: [] } },
      wallet: { tokens: 0 },
    };

    applyProgressExport(exported, target);

    expect(target.settings.soundEnabled).toBe(false);
    expect(target.progress.bests).toEqual(source.progress.bests);
    expect(target.mastery.families).toEqual(source.mastery.families);
    expect(target.streak).toEqual({ current: 3, best: 12 });
    expect(target.curriculum.active).toEqual(source.curriculum.active);
    expect(target.wallet.tokens).toBe(7);
  });
});
