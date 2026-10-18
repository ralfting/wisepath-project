import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import { MemoryAuth } from "@/infrastructure/auth/MemoryAuth"
import { renderWithLayers } from "@/test/render"
import { useLogin, useSession } from "../auth"
import { useRecentPages, useRememberOpened } from "./recent"

const ada = { email: "ada@example.com", password: "correct-horse", name: "Ada" }
const bob = { email: "bob@example.com", password: "battery-staple", name: "Bob" }

function OpenedPage() {
  useRememberOpened({ pathId: "p1", pageId: "hooks", title: "Hooks", pathTitle: "React" })
  return null
}

// What the search palette needs from the account: who is in, a page opened, and the recent list
function Browser({ as, opens }: { as: { email: string; password: string }; opens: boolean }) {
  const login = useLogin()
  const session = useSession()
  const recent = useRecentPages()
  return (
    <>
      <button onClick={() => login(as)}>Log in</button>
      {session.status === "signedIn" && opens && <OpenedPage />}
      {session.status === "signedIn" && <p>Signed in</p>}
      <ul aria-label="Recent pages">
        {recent.map((page) => <li key={page.pageId}>{page.title}</li>)}
      </ul>
    </>
  )
}

async function visit(as: { email: string; password: string }, opens = false) {
  const view = renderWithLayers(<Browser as={as} opens={opens} />, MemoryAuth([ada, bob]))
  await userEvent.setup().click(screen.getByRole("button", { name: "Log in" }))
  await screen.findByText("Signed in")
  return view
}

describe("recent pages on a browser two learners share", () => {
  beforeEach(() => localStorage.clear())

  it("shows each learner only the pages they opened", async () => {
    // The list every account once shared, left over from before lists were per account
    localStorage.setItem("wisepath:recent-pages", JSON.stringify([{ pathId: "p9", pageId: "x", title: "Diary", pathTitle: "Ada's", openedAt: 1 }]))

    const first = await visit(ada, true)
    expect(await screen.findByRole("listitem")).toHaveProperty("textContent", "Hooks")
    first.unmount()

    const second = await visit(bob)
    expect(screen.queryAllByRole("listitem")).toHaveLength(0)
    second.unmount()

    await visit(ada)
    expect(await screen.findByRole("listitem")).toHaveProperty("textContent", "Hooks")
    expect(localStorage.getItem("wisepath:recent-pages")).toBeNull()
  })
})
