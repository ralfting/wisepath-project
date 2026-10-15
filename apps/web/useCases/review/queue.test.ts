import { describe, expect, it } from "vitest"
import { PageId, ProjectId } from "@wisepath/domain/projects"
import { CardId } from "@wisepath/domain/review"
import type { DueCard } from "@wisepath/domain/review"
import { endOfDay, gradeCard, startSitting } from "./queue"

const card = (n: number): DueCard => ({
  id: CardId.make(`c${n}`),
  projectId: ProjectId.make("p"),
  pageId: PageId.make("page"),
  kind: "basic",
  question: `Q${n}?`,
  answer: "A",
  pathTitle: "Rust",
  pageTitle: "Ownership",
  state: null
})
const now = new Date("2026-03-09T12:00:00Z")

describe("a review sitting", () => {
  it("moves on to the next card after a grade", () => {
    const next = gradeCard(startSitting([card(1), card(2)]), 3, now)!
    expect(next.sitting.cards.map((c) => c.id)).toEqual(["c2"])
    expect(next.sitting.reviewed).toBe(1)
    expect(next.state.reps).toBe(1)
  })

  it("asks a card graded Again once more at the end, from its new state", () => {
    const again = gradeCard(startSitting([card(1), card(2)]), 1, now)!
    expect(again.sitting.cards.map((c) => c.id)).toEqual(["c2", "c1"])
    expect(again.sitting.cards[1].state?.reps).toBe(1)
    const last = gradeCard(gradeCard(again.sitting, 3, now)!.sitting, 3, now)!
    expect(last.sitting.cards).toEqual([])
    expect(last.sitting.reviewed).toBe(3)
    expect(last.state.reps).toBe(2)
  })

  it("has nothing to grade once done", () => {
    expect(gradeCard(startSitting([]), 3, now)).toBeNull()
  })

  it("ends the day at the next local midnight", () => {
    const end = endOfDay(new Date(2026, 2, 9, 23, 59))
    expect([end.getFullYear(), end.getMonth(), end.getDate(), end.getHours()]).toEqual([2026, 2, 10, 0])
  })
})
