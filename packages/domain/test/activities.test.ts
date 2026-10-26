import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { ActivityId, PageId, PathId, activitiesIn, editPage, mayEditPage, newPath, openActivities } from "../src/paths/index"
import type { Path, PathKind } from "../src/paths/index"

const pathId = PathId.make("journal")
const pageId = PageId.make("page")
const page = (content: string) => ({ id: pageId, content })
const texts = (content: string) => activitiesIn(pathId, page(content)).map((a) => a.text)
const ids = (content: string) => activitiesIn(pathId, page(content)).map((a) => a.id)

const twoActivities = [
  "Keep a journal.",
  "",
  "> [!activity]",
  "> Write two things you like doing when you read.",
  "",
  "Read it again at the end of the month.",
  "",
  "> [!activity]",
  "> Pick a book and copy the first sentence that stayed with you."
].join("\n")

/** A map whose root page holds the text, of either kind, as its owner sees it */
const pathWith = (content: string, kind: PathKind = "learningPath") =>
  Effect.gen(function*() {
    const path = newPath(pathId, "Reading", pageId, new Date("2030-01-01"), kind)
    return yield* editPage(path, pageId, { content }, new Date("2030-01-01"))
  })
const rootOf = (path: Path) => path.pages.find((p) => p.id === pageId)!

describe("activitiesIn", () => {
  it("lists a page's activities in the order they are written, with their words", () => {
    assert.deepStrictEqual(texts(twoActivities), [
      "Write two things you like doing when you read.",
      "Pick a book and copy the first sentence that stayed with you."
    ])
  })

  it("keeps the formatting inside one and reads lines and lists as its words", () => {
    const content = "> [!ACTIVITY]\n> Write **two** things:\n>\n> - one `inline`\n> - two"
    assert.deepStrictEqual(texts(content), ["Write **two** things: - one `inline` - two"])
  })

  it("never finds one in code, nor in another kind of callout or a plain quote", () => {
    const content = ["```md", "> [!activity]", "> Not one", "```", "`> [!activity]`", "> [!info]", "> A note", "> Just a quote"].join("\n")
    assert.deepStrictEqual(texts(content), [])
  })

  it("finds one in a list item, inside a quote, and carried on by a plain line", () => {
    const content = ["- > [!activity]", "  > In a list", "", "> Said before", ">", "> > [!activity]", "> > Inside", "", "> [!activity]", "> Carried", "on"].join("\n")
    assert.deepStrictEqual(texts(content), ["In a list", "Inside", "Carried on"])
  })

  it("keeps an activity's name when others are added around it or its words re-wrapped, and gives new words a new one", () => {
    const [first, second] = ids(twoActivities)
    const added = `> [!activity]\n> A new first one\n\n${twoActivities.replace("doing when", "doing\n> when")}`
    assert.deepStrictEqual(ids(added).slice(1), [first, second])
    assert.notInclude(ids(twoActivities.replace("two things", "three things")), first)
  })

  it("tells the same words twice apart, and names an activity differently on another page", () => {
    const twice = "> [!activity]\n> Read aloud\n\n> [!activity]\n> Read aloud"
    const [a, b] = ids(twice)
    assert.notStrictEqual(a, b)
    assert.notStrictEqual(activitiesIn(pathId, { id: PageId.make("other"), content: twice })[0].id, a)
  })

  it("leaves open the ones the reader has not ticked", () => {
    const [first, second] = activitiesIn(pathId, page(twoActivities))
    assert.deepStrictEqual(openActivities(pathId, { ...page(twoActivities), done: [first.id] }), [second])
  })
})

describe("progress on a page with activities", () => {
  it.effect("refuses to mark a learning path's page studied while an activity is open, and marks it once all are done", () =>
    Effect.gen(function*() {
      const path = yield* pathWith(twoActivities)
      const error = yield* Effect.flip(editPage(path, pageId, { studied: true }))
      assert.strictEqual(error._tag, "ActivitiesOpen")

      const done = ids(twoActivities)
      const studied = yield* editPage(path, pageId, { done, studied: true }, new Date("2031-01-01"))
      assert.deepStrictEqual([rootOf(studied).studied, rootOf(studied).done], [true, done])
      assert.strictEqual(rootOf(studied).updatedAt, rootOf(path).updatedAt)
    }))

  it.effect("marks a study's page studied with its activities open", () =>
    Effect.gen(function*() {
      const path = yield* pathWith(twoActivities, "study")
      assert.isTrue(rootOf(yield* editPage(path, pageId, { studied: true })).studied)
    }))

  it.effect("unmarks a studied page when one of its activities is unticked", () =>
    Effect.gen(function*() {
      const [first, second] = ids(twoActivities)
      const studied = yield* editPage(yield* pathWith(twoActivities), pageId, { done: [first, second], studied: true })
      const unticked = yield* editPage(studied, pageId, { done: [second] })
      assert.deepStrictEqual([rootOf(unticked).studied, rootOf(unticked).done], [false, [second]])
    }))

  it.effect("keeps a page studied when an activity is added to it, and changes nothing when the same ticks come again", () =>
    Effect.gen(function*() {
      const done = ids(twoActivities)
      const studied = yield* editPage(yield* pathWith(twoActivities), pageId, { done, studied: true })
      const added = yield* editPage(studied, pageId, { content: `${twoActivities}\n\n> [!activity]\n> One more` })
      assert.isTrue(rootOf(added).studied)
      assert.strictEqual(yield* editPage(added, pageId, { done: [...done].reverse(), studied: true }), added)
    }))

  it.effect("keeps only ticks of activities the page has", () =>
    Effect.gen(function*() {
      const [first] = ids(twoActivities)
      const ticked = yield* editPage(yield* pathWith(twoActivities), pageId, { done: [first, ActivityId.make("made-up")] })
      assert.deepStrictEqual(rootOf(ticked).done, [first])
    }))

  it("lets a reader tick activities, as they mark pages studied, and nothing else", () => {
    const reader = { access: "viewer" as const, rootPageId: PageId.make("root") }
    assert.deepStrictEqual(
      [mayEditPage(reader, pageId, { done: ids(twoActivities), studied: true }), mayEditPage(reader, pageId, { done: [], content: "x" })],
      [true, false]
    )
  })
})
