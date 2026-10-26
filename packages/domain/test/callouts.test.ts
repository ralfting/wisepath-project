import { assert, describe, it } from "@effect/vitest"
import { readCalloutMarker } from "../src/paths/index"

describe("reading a callout marker", () => {
  it.each([
    ["[!warning]\nBack up first.", { kind: "warning", rest: "Back up first." }],
    ["  [!DANGER]  ", { kind: "danger", rest: "" }],
    ["[!info]\r\nLine", { kind: "info", rest: "Line" }],
    ["[!note]\nGitHub kind", null],
    ["Just a quote [!info]", null]
  ])("%j", (text, expected) => {
    assert.deepStrictEqual(readCalloutMarker(text), expected)
  })
})
