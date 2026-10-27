import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { PageId, PathId, QuestionId, activitiesIn, editPage, mayEditPage, newPath, openTasks, questionsIn, rewordedQuestions } from "../src/paths/index"
import type { Path, PathKind } from "../src/paths/index"

const pathId = PathId.make("journal")
const pageId = PageId.make("page")
const page = (content: string) => ({ id: pageId, content })
const texts = (content: string) => questionsIn(pathId, page(content)).map((q) => q.text)
const ids = (content: string) => questionsIn(pathId, page(content)).map((q) => q.id)
const question = (words: string) => `> [!question]\n> ${words}`

const twoQuestions = [question("What makes a habit last?"), "", "Some text between.", "", question("Which one will you keep?")].join("\n")

/** A map whose root page holds the text, of either kind, as its owner sees it */
const pathWith = (content: string, kind: PathKind = "learningPath") =>
  Effect.gen(function*() {
    const path = newPath(pathId, "Habits", pageId, new Date("2030-01-01"), kind)
    return yield* editPage(path, pageId, { content }, new Date("2030-01-01"))
  })
const rootOf = (path: Path) => path.pages.find((p) => p.id === pageId)!

/** Answers these questions with these words, or takes the answers away with a blank */
const answer = (questions: ReadonlyArray<QuestionId>, body = "Small steps.") => questions.map((q) => ({ question: q, body }))

describe("questionsIn", () => {
  it("lists a page's questions in the order they are written, with their words", () => {
    assert.deepStrictEqual(texts(twoQuestions), ["What makes a habit last?", "Which one will you keep?"])
  })

  it("keeps the formatting inside one, and never finds one in code or in another kind of callout", () => {
    const content = ["> [!QUESTION]", "> Why **this** `one`?", "", "```md", question("In code"), "```", "> [!activity]", "> Do it"].join("\n")
    assert.deepStrictEqual(texts(content), ["Why **this** `one`?"])
  })

  it("tells the same words twice apart, and never names a question as the activity with its words", () => {
    const [a, b] = ids(`${question("Why?")}\n\n${question("Why?")}`)
    assert.notStrictEqual(a, b)
    const [activity] = activitiesIn(pathId, page("> [!activity]\n> Why?"))
    assert.notStrictEqual<string>(activity.id, a)
  })
})

describe("rewordedQuestions", () => {
  const [first, second] = ids(twoQuestions)
  const reworded = (content: string) => rewordedQuestions(pathId, page(twoQuestions), page(content))

  it("pairs a question reworded in place with its new name", () => {
    const content = twoQuestions.replace("What makes", "What helps")
    assert.deepStrictEqual(reworded(content), [{ from: first, to: ids(content)[0] }])
  })

  it("renames nothing when questions move, are added or are deleted", () => {
    const moved = [question("Which one will you keep?"), "", question("What makes a habit last?")].join("\n")
    const added = `${twoQuestions}\n\n${question("One more?")}`
    const deleted = question("Which one will you keep?")
    assert.deepStrictEqual([reworded(moved), reworded(added), reworded(deleted)], [[], [], []])
    assert.deepStrictEqual(ids(moved), [second, first])
  })
})

describe("answers on a page", () => {
  it.effect("keeps the reader's answer, rewrites it, and takes it away when cleared, without editing the page", () =>
    Effect.gen(function*() {
      const [first] = ids(twoQuestions)
      const path = yield* pathWith(twoQuestions)
      const answered = yield* editPage(path, pageId, { answers: answer([first]) }, new Date("2031-01-01"))
      assert.deepStrictEqual(rootOf(answered).answers, [{ question: first, body: "Small steps." }])
      assert.strictEqual(rootOf(answered).updatedAt, rootOf(path).updatedAt)

      const rewritten = yield* editPage(answered, pageId, { answers: [...answer([first], "Cues."), ...answer([first], "Cues and rewards.")] })
      assert.deepStrictEqual(rootOf(rewritten).answers, [{ question: first, body: "Cues and rewards." }])
      assert.isUndefined(rootOf(yield* editPage(rewritten, pageId, { answers: answer([first], "  \n") })).answers)
    }))

  it.effect("keeps only answers to questions the page has", () =>
    Effect.gen(function*() {
      const [first] = ids(twoQuestions)
      const answered = yield* editPage(yield* pathWith(twoQuestions), pageId, { answers: answer([first, QuestionId.make("made-up")]) })
      assert.deepStrictEqual(rootOf(answered).answers?.map((a) => a.question), [first])
    }))

  it.effect("keeps the answer to a deleted question while the reader answers another, and shows it again with its words", () =>
    Effect.gen(function*() {
      const [first, second] = ids(twoQuestions)
      const answered = yield* editPage(yield* pathWith(twoQuestions), pageId, { answers: answer([first]) })
      const deleted = yield* editPage(answered, pageId, { content: question("Which one will you keep?") })
      const other = yield* editPage(deleted, pageId, { answers: answer([second], "Reading.") })
      const restored = yield* editPage(other, pageId, { content: twoQuestions })
      assert.deepStrictEqual(openTasks(restored, rootOf(restored)), [])
    }))

  it.effect("moves the reader's answer to a question reworded in the text", () =>
    Effect.gen(function*() {
      const [first] = ids(twoQuestions)
      const answered = yield* editPage(yield* pathWith(twoQuestions), pageId, { answers: answer([first]) })
      const content = twoQuestions.replace("What makes", "What helps")
      const edited = yield* editPage(answered, pageId, { content })
      assert.deepStrictEqual(rootOf(edited).answers, [{ question: ids(content)[0], body: "Small steps." }])
    }))

  it.effect("refuses to mark a learning path's page studied while a question is unanswered, and marks it once all are", () =>
    Effect.gen(function*() {
      const path = yield* pathWith(twoQuestions)
      const error = yield* Effect.flip(editPage(path, pageId, { studied: true }))
      assert.strictEqual(error._tag, "ActivitiesOpen")
      assert.deepStrictEqual(openTasks(path, rootOf(path)).map((task) => task.kind), ["question", "question"])

      const studied = yield* editPage(path, pageId, { answers: answer(ids(twoQuestions)), studied: true })
      assert.isTrue(rootOf(studied).studied)
      assert.deepStrictEqual(openTasks(studied, rootOf(studied)), [])
    }))

  it.effect("marks a study's page studied with its questions unanswered", () =>
    Effect.gen(function*() {
      assert.isTrue(rootOf(yield* editPage(yield* pathWith(twoQuestions, "study"), pageId, { studied: true })).studied)
    }))

  it.effect("unmarks a studied page when an answer is cleared, and keeps it studied when a question is added", () =>
    Effect.gen(function*() {
      const [first, second] = ids(twoQuestions)
      const studied = yield* editPage(yield* pathWith(twoQuestions), pageId, { answers: answer([first, second]), studied: true })
      const added = yield* editPage(studied, pageId, { content: `${twoQuestions}\n\n${question("One more?")}` })
      assert.isTrue(rootOf(added).studied)
      const cleared = yield* editPage(added, pageId, { answers: answer([first], "") })
      assert.isFalse(rootOf(cleared).studied)
    }))

  it("lets a reader answer, as they tick activities, and nothing else", () => {
    const reader = { access: "viewer" as const, rootPageId: PageId.make("root") }
    assert.deepStrictEqual(
      [mayEditPage(reader, pageId, { answers: answer(ids(twoQuestions)) }), mayEditPage(reader, pageId, { answers: [], content: "x" })],
      [true, false]
    )
  })
})
