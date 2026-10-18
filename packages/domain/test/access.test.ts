import { assert, describe, it } from "@effect/vitest"
import { UserId } from "../src/auth"
import { Schema } from "effect"
import { PageId, PublicationRequest, VisibilityEdit, accessOf, canEdit, canManage, canRead, mayEditPage } from "../src/paths/index"
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
    ["no account, public", facts("public"), null, "viewer"],
    ["a stranger, published", facts("published"), stranger, "viewer"],
    ["no account, published", facts("published"), null, "viewer"],
    ["an invited editor, published", facts("published", { role: "editor", source: "invited" }), member, "editor"]
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

describe("mayEditPage", () => {
  it("needs reading for a studied mark, the owner to rename the root, and editing for the rest", () => {
    const root = PageId.make("root")
    const page = PageId.make("page")
    const edits = [
      [page, { studied: true }],
      [page, { content: "x" }],
      [page, { title: "New" }],
      [root, { title: "Renamed" }],
      [root, { content: "x" }],
      [page, { studied: true, content: "x" }]
    ] as const
    const table = (["owner", "editor", "viewer"] as const).map((access) =>
      edits.map(([pageId, edit]) => mayEditPage({ access, rootPageId: root }, pageId, edit))
    )
    assert.deepStrictEqual(table, [
      [true, true, true, true, true, true],
      [true, true, true, false, true, true],
      [true, false, false, false, false, false]
    ])
  })
})

describe("publishing", () => {
  it("is never a visibility the owner sets: only an approval publishes", () => {
    const decode = Schema.decodeUnknownExit(VisibilityEdit)
    assert.isTrue(decode({ visibility: "public" })._tag === "Success")
    assert.isTrue(decode({ visibility: "published" })._tag === "Failure")
  })

  it("asks what the path teaches, who it is for and its language", () => {
    const decode = Schema.decodeUnknownExit(PublicationRequest)
    assert.isTrue(decode({ description: " React tests ", audience: "Frontend devs", language: "pt-BR" })._tag === "Success")
    assert.isTrue(decode({ description: " ", audience: "Frontend devs", language: "pt-BR" })._tag === "Failure")
    assert.isTrue(decode({ description: "React tests", audience: "", language: "pt-BR" })._tag === "Failure")
    assert.isTrue(decode({ description: "React tests", audience: "Frontend devs", language: "fr" })._tag === "Failure")
  })
})
