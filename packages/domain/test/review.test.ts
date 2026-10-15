import { assert, describe, it } from "@effect/vitest"
import { PageId, ProjectId } from "../src/projects/index"
import {
  AGAIN_AFTER,
  BLANK,
  cardsIn,
  cardsOf,
  clozeRanges,
  dueToday,
  isCardLine,
  nextIntervals,
  reviewCounts,
  schedule
} from "../src/review/index"
import type { Card, Grade, KeptState, ReviewState } from "../src/review/index"

const path = { id: ProjectId.make("p"), title: "Effect" }
const page = (content: string, id = "page") => ({ id: PageId.make(id), title: "Tracing", content })
const questions = (content: string) => cardsIn(page(content), path).map((c) => [c.kind, c.question, c.answer])

const DAY = 24 * 60 * 60 * 1000
const days = (ms: number) => Math.round(ms / DAY)

describe("cards in a page", () => {
  it("reads `Question :: Answer` lines", () => {
    assert.deepStrictEqual(questions("Intro\n\nWhat does Effect.fn add? :: A span named after the function\n"), [
      ["basic", "What does Effect.fn add?", "A span named after the function"]
    ])
  })

  it("finds two cards on a page, in list items and headings too, and says where they come from", () => {
    const cards = cardsIn(page("- One? :: 1\n## Two? :: 2\n1. [ ] Three? :: 3\n> Four? :: 4"), path)
    assert.deepStrictEqual(cards.map((c) => c.question), ["One?", "Two?", "Three?", "Four?"])
    assert.deepStrictEqual([cards[0].pathTitle, cards[0].pageTitle, cards[0].projectId, cards[0].pageId], ["Effect", "Tracing", "p", "page"])
  })

  it("needs a question and an answer, spaced around ::", () => {
    assert.deepStrictEqual(questions("std::vector holds things\n:: no question\nNo answer ::\nUse `a::b` here"), [])
    assert.isTrue(isCardLine("- Q? :: A"))
    assert.isFalse(isCardLine("std::vector"))
    assert.isFalse(isCardLine("Q? :: "))
  })

  it("ignores code, fenced or inline", () => {
    const md = "```ts\nconst q = a :: b\nconst c = ==x==\n```\nInline `x :: y` stays code\n~~~\nQ :: A\n~~~\nReal? :: Yes"
    assert.deepStrictEqual(questions(md), [["basic", "Real?", "Yes"]])
  })

  it("keeps inline code inside a card as written", () => {
    assert.deepStrictEqual(questions("What does `Effect.fn` add? :: A span"), [["basic", "What does `Effect.fn` add?", "A span"]])
  })

  it("makes a fill-in-the-blank card for each ==marked== part of a line", () => {
    assert.deepStrictEqual(questions("A ==span== is named after the ==function==."), [
      ["cloze", `A ${BLANK} is named after the function.`, "span"],
      ["cloze", `A span is named after the ${BLANK}.`, "function"]
    ])
    assert.deepStrictEqual(clozeRanges("a ==b== c"), [{ from: 2, to: 7 }])
  })

  it("reads a line with :: as a question, whatever it marks", () => {
    assert.deepStrictEqual(questions("Is ==this== a cloze? :: No"), [["basic", "Is ==this== a cloze?", "No"]])
  })

  it("keeps a card's identity when its answer changes, and makes a new one when its question does", () => {
    const [before] = cardsIn(page("Q? :: old answer"), path)
    const [answerEdited] = cardsIn(page("- Q?   ::  new answer"), path)
    const [questionEdited] = cardsIn(page("Q, reworded? :: old answer"), path)
    const [otherPage] = cardsIn(page("Q? :: old answer", "other"), path)
    const [otherPath] = cardsIn(page("Q? :: old answer"), { id: ProjectId.make("q"), title: "Effect" })
    assert.strictEqual(answerEdited.id, before.id)
    assert.notStrictEqual(questionEdited.id, before.id)
    assert.notStrictEqual(otherPage.id, before.id)
    assert.notStrictEqual(otherPath.id, before.id)
  })

  it("counts the same question twice on a page once", () => {
    assert.strictEqual(questions("Q? :: A\nQ? :: B").length, 1)
  })

  it("in a learning path, reads the cards of the pages studied only; in a study, every page's", () => {
    const pages = [{ ...page("A? :: a", "1"), studied: false }, { ...page("B? :: b", "2"), studied: true }]
    assert.deepStrictEqual(cardsOf({ ...path, kind: "learningPath", pages }).map((c) => c.pageId), ["2"])
    assert.deepStrictEqual(cardsOf({ ...path, kind: "study", pages }).map((c) => c.pageId), ["1", "2"])
  })

  it("reads every page of a path", () => {
    const project = { ...path, pages: [page("A? :: a", "1"), page("Nothing here", "2"), page("B? :: b", "3")] }
    assert.deepStrictEqual(cardsOf(project).map((c) => c.pageId), ["1", "3"])
  })
})

describe("scheduling (FSRS)", () => {
  const start = new Date("2026-01-01T09:00:00Z")

  /** Reviews a new card with these grades, each on the day it falls due */
  function review(grades: Grade[]): ReviewState[] {
    const states: ReviewState[] = []
    let state: ReviewState | null = null
    let now = start
    for (const grade of grades) {
      state = schedule(state, grade, now)
      states.push(state)
      now = new Date(state.due)
    }
    return states
  }
  const interval = (s: ReviewState) => Date.parse(s.due) - Date.parse(s.lastReview!)

  it("asks a new card again in days that grow with every Good", () => {
    const steps = review([3, 3, 3, 3, 3]).map((s) => days(interval(s)))
    assert.isAtLeast(steps[0], 1)
    for (let i = 1; i < steps.length; i++) assert.isAbove(steps[i], steps[i - 1])
    assert.deepStrictEqual(review([3, 3, 3]).map((s) => s.reps), [1, 2, 3])
  })

  it("brings a forgotten card back in minutes, counts the lapse, and starts its intervals over", () => {
    const [, , good, again] = review([3, 3, 3, 1])
    assert.strictEqual(interval(again), AGAIN_AFTER)
    assert.strictEqual(again.lapses, 1)
    assert.isBelow(again.stability, good.stability)
    assert.isAbove(again.difficulty, good.difficulty)
    // Relearned the same sitting: back in about a day, far sooner than before it was forgotten
    const relearned = schedule(again, 3, new Date(again.due))
    assert.isBelow(days(interval(relearned)), days(interval(good)))
  })

  it("orders the grades: Hard sooner than Good, Good sooner than Easy", () => {
    const [first] = review([3])
    const intervals = nextIntervals(first, new Date(first.due))
    assert.isBelow(intervals[1], intervals[2])
    assert.isBelow(intervals[2], intervals[3])
    assert.isBelow(intervals[3], intervals[4])
    const fresh = nextIntervals(null, start)
    assert.isBelow(fresh[3], fresh[4])
  })

  it("keeps difficulty between 1 and 10", () => {
    for (const s of [...review([1, 1, 1, 1, 1, 1]), ...review([4, 4, 4, 4, 4, 4])]) {
      assert.isAtLeast(s.difficulty, 1)
      assert.isAtMost(s.difficulty, 10)
    }
  })
})

describe("the review queue", () => {
  const dayEnds = new Date("2026-03-10T03:00:00Z")
  const now = new Date("2026-03-09T12:00:00Z")
  const card = (n: number, projectId = "p"): Card => ({
    ...cardsIn(page(`Q${n}? :: A`, `page-${n}`), { id: ProjectId.make(projectId), title: projectId })[0]
  })
  const kept = (c: Card, due: string, firstReview = "2026-01-01T00:00:00Z"): KeptState => ({
    cardId: c.id,
    state: { ...schedule(null, 3, now), due },
    firstReview
  })

  it("lists reviews that fall due before the day ends, earliest first, then new cards in reading order", () => {
    const [a, b, c, d, e] = [1, 2, 3, 4, 5].map((n) => card(n))
    const states = [kept(a, "2026-03-09T20:00:00Z"), kept(b, "2026-03-01T00:00:00Z"), kept(c, "2026-03-12T00:00:00Z")]
    assert.deepStrictEqual(dueToday([a, b, c, d, e], states, { dayEnds }).map((x) => x.id), [b.id, a.id, d.id, e.id])
    assert.isNull(dueToday([d], [], { dayEnds })[0].state)
  })

  it("starts only a few new cards a day, counting those already started today in any path", () => {
    const cards = [1, 2, 3, 4, 5].map((n) => card(n))
    const elsewhere = card(9, "q")
    const startedToday = kept(elsewhere, "2026-03-20T00:00:00Z", "2026-03-09T08:00:00Z")
    const due = dueToday(cards, [startedToday], { dayEnds, newPerDay: 3 })
    assert.deepStrictEqual(due.map((x) => x.id), cards.slice(0, 2).map((c) => c.id))
    assert.strictEqual(dueToday(cards, [], { dayEnds }).length, 5)
  })

  it("never lists a state whose card is gone", () => {
    const gone = card(1)
    assert.deepStrictEqual(dueToday([], [kept(gone, "2026-03-01T00:00:00Z")], { dayEnds }), [])
  })

  it("counts cards and today's due ones, overall and per path", () => {
    const [a, b] = [card(1), card(2)]
    const c = card(3, "q")
    const counts = reviewCounts([a, b, c], [kept(a, "2026-03-30T00:00:00Z")], { dayEnds })
    assert.strictEqual(counts.due, 2)
    assert.deepStrictEqual(counts.paths, [
      { projectId: ProjectId.make("p"), cards: 2, due: 1 },
      { projectId: ProjectId.make("q"), cards: 1, due: 1 }
    ])
  })
})
