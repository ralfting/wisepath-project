import { assert, describe, it } from "@effect/vitest"
import { excerptOf, fold, marksIn, matchesAll, queryWords, rankHits, titleMatch } from "../src/search/index"

const marked = (text: string, query: string) => marksIn(text, query).map(([s, e]) => text.slice(s, e))

describe("search", () => {
  it("compares without case or accents", () => {
    assert.strictEqual(fold("Revisão ESPAÇADA"), "revisao espacada")
    assert.deepStrictEqual(queryWords("  Revisão  revisao jwt "), ["revisao", "jwt"])
    assert.isTrue(matchesAll("Revisão espaçada", "espacada REVISAO"))
    assert.isFalse(matchesAll("Revisão espaçada", "revisao cards"))
    assert.isFalse(matchesAll("anything", "   "))
  })

  it("marks every word where it appears in the original text, accents kept", () => {
    assert.deepStrictEqual(marked("Revisão e revisao", "revisao"), ["Revisão", "revisao"])
    assert.deepStrictEqual(marked("JWT guards, jwt tokens", "jwt guard"), ["JWT", "guard", "jwt"])
    // Overlapping matches become one mark
    assert.deepStrictEqual(marked("providers", "provide vider"), ["providers".slice(0, 8)])
    assert.deepStrictEqual(marksIn("nothing here", "jwt"), [])
  })

  it("tells how well a title answers the query", () => {
    assert.strictEqual(titleMatch("Providers", "providers"), "exact")
    assert.strictEqual(titleMatch("  Injeção  de dependência ", "injecao de dependencia"), "exact")
    assert.strictEqual(titleMatch("Providers and scopes", "providers"), "prefix")
    assert.strictEqual(titleMatch("Custom providers", "providers custom"), "words")
    assert.strictEqual(titleMatch("Guards", "providers"), "none")
    assert.strictEqual(titleMatch("", "providers"), "none")
  })

  it("ranks exact titles, then prefixes, then title words, then text matches, newest first within each", () => {
    const hit = (title: string, updatedAt: string) => ({ title, updatedAt })
    const ranked = rankHits("providers", [
      hit("Guards", "2026-05-01T00:00:00.000Z"),
      hit("Custom providers", "2026-01-01T00:00:00.000Z"),
      hit("Providers and scopes", "2026-01-01T00:00:00.000Z"),
      hit("Modules", "2026-06-01T00:00:00.000Z"),
      hit("Providers", "2025-01-01T00:00:00.000Z"),
      hit("Providers in depth", "2026-03-01T00:00:00.000Z")
    ])
    assert.deepStrictEqual(
      ranked.map((h) => h.title),
      ["Providers", "Providers in depth", "Providers and scopes", "Custom providers", "Modules", "Guards"]
    )
  })

  it("shows the line of the text where the query first appears", () => {
    const content = "# Intro\n\nNothing to see.\n\n- A **provider** can be injected.\n\nMore providers later."
    assert.deepStrictEqual(excerptOf(content, "provider"), {
      text: "A **provider** can be injected.",
      marks: [[4, 12]]
    })
    assert.isNull(excerptOf(content, "guard"))
    assert.strictEqual(excerptOf("## Revisão\n", "revisao")?.text, "Revisão")
    assert.strictEqual(excerptOf("- [x] Revisar cartões", "cartoes")?.text, "Revisar cartões")
  })

  it("reads a link or a citation in the excerpt as the title it names", () => {
    assert.deepStrictEqual(excerptOf("As in @[[Market fit]], see [[Pricing]].", "market"), {
      text: "As in Market fit, see Pricing.",
      marks: [[6, 12]]
    })
  })

  it("cuts a long line around the match, at word boundaries", () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`)
    words[25] = "needle"
    const excerpt = excerptOf(words.join(" "), "needle", 60)!
    assert.isTrue(excerpt.text.startsWith("…word"))
    assert.isTrue(excerpt.text.endsWith("…"))
    assert.isAtMost(excerpt.text.length, 62)
    const [[start, end]] = excerpt.marks
    assert.strictEqual(excerpt.text.slice(start, end), "needle")
    // The match keeps some of what comes before it
    assert.isAbove(start, 20)
  })
})
