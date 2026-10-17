import { assert, describe, it } from "@effect/vitest"
import { UserId } from "../src/auth"
import { accessOf, canEdit, canManage, canRead } from "../src/paths/index"
import type { AccessFacts, MemberRole, MemberSource, PathAccess, PathVisibility } from "../src/paths/index"

const owner = UserId.make("owner")
const member = UserId.make("member")
const stranger = UserId.make("stranger")

const facts = (
  visibility: PathVisibility,
  membership?: { role: MemberRole; source: MemberSource }
): AccessFacts => ({
  ownerId: owner,
  visibility,
  members: membership ? [{ userId: member, ...membership }] : []
})

describe("accessOf", () => {
  // Every combination of who reads, how the path is shared and whether it is public
  const cases: ReadonlyArray<[string, AccessFacts, UserId | null, PathAccess]> = [
    ["the owner, private", facts("private"), owner, "owner"],
    ["the owner, public", facts("public"), owner, "owner"],
    ["an invited editor, private", facts("private", { role: "editor", source: "invited" }), member, "editor"],
    ["an invited editor, public", facts("public", { role: "editor", source: "invited" }), member, "editor"],
    ["an invited viewer, private", facts("private", { role: "viewer", source: "invited" }), member, "viewer"],
    ["a taker, public", facts("public", { role: "viewer", source: "taken" }), member, "viewer"],
    ["a stranger, private", facts("private"), stranger, "none"],
    ["a stranger, public", facts("public"), stranger, "viewer"],
    ["a stranger, private and shared with someone else", facts("private", { role: "editor", source: "invited" }), stranger, "none"],
    ["no account, private", facts("private"), null, "none"],
    ["no account, public", facts("public"), null, "viewer"]
  ]

  for (const [name, path, viewer, expected] of cases) {
    it(name, () => {
      assert.strictEqual(accessOf(path, viewer), expected)
    })
  }
})

describe("what each access allows", () => {
  it("reads with any access, edits pages as owner or editor, manages the path as owner only", () => {
    const table = (["owner", "editor", "viewer", "none"] as const).map((access) => [
      access,
      canRead(access),
      canEdit(access),
      canManage(access)
    ])
    assert.deepStrictEqual(table, [
      ["owner", true, true, true],
      ["editor", true, true, false],
      ["viewer", true, false, false],
      ["none", false, false, false]
    ])
  })
})
