import test from "node:test";
import assert from "node:assert/strict";
import { defaults, sizes, validSettings, printPresets, matchingPreset,
  mmToPx, pxToMm, ptToPx, pxToPt } from "../app/book/typography";

test("paper, type and margins use the same physical unit scale", () => {
  assert.ok(Math.abs(mmToPx(25.4) - 96) < 1e-10);
  assert.equal(ptToPx(72), 96);
  assert.equal(pxToPt(ptToPx(10.5)), 10.5);
  assert.ok(Math.abs(pxToMm(mmToPx(18)) - 18) < 1e-10);
  for (const paper of Object.values(sizes)) {
    assert.ok(Math.abs(paper.width / paper.height - paper.widthMm / paper.heightMm) < 1e-10);
  }
  assert.equal(sizes.b5.widthMm, 176);
  assert.equal(sizes.jisB5.widthMm, 182);
  assert.equal(sizes.fourSix.heightMm, 188);
});

test("every print preset survives validation and leaves usable text space", () => {
  assert.equal(matchingPreset(defaults), "essay");
  for (const preset of printPresets) {
    const settings = validSettings({ ...defaults, ...preset.values });
    assert.equal(matchingPreset(settings), preset.id);
    const paper = sizes[settings.size as keyof typeof sizes];
    assert.ok(paper.width - 2 * settings.margin > settings.fontSize * 15);
    assert.ok(paper.height - 2 * settings.margin - 40 > settings.fontSize * settings.lineHeight * 15);
  }
});

test("migrate the old default once without overwriting custom typography or reading preferences", () => {
  const legacy = { ...defaults, typographyVersion: undefined, size: "a5", font: "serif", fontSize: 18, lineHeight: 1.9, margin: 56, theme: "night", layout: "spread" };
  const migrated = validSettings(legacy);
  assert.equal(matchingPreset(migrated), "essay");
  assert.equal(migrated.theme, "night");
  assert.equal(migrated.layout, "spread");
  const custom = validSettings({ ...legacy, fontSize: 22 });
  assert.equal(custom.fontSize, 22);
  assert.equal(custom.font, "serif");
  assert.equal(custom.margin, 56);
  assert.equal(validSettings({ ...legacy, typographyVersion: 2 }).font, "serif");
  assert.equal(validSettings({ size: "constructor", font: "toString", fontSize: NaN }).size, defaults.size);
});
