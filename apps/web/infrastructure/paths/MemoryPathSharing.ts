import { Effect, Layer, Ref } from "effect"
import { PathNotFound, PathSharing } from "@wisepath/domain/paths"
import type { Path, PathId, PathInvite, PathShare, SharedWith } from "@wisepath/domain/paths"
import { UserId } from "@wisepath/domain/auth"

/**
 * Sharing kept in memory, for tests: who each path is shared with, and the public paths anyone may read. Follows
 * the API's answers (sharing again changes the role, an email with no account is kept as an invite, a private path
 * is not found); the accounts it knows are the people it starts with.
 */
export const MemoryPathSharing = (
  seed: { readonly shared?: Record<string, SharedWith>; readonly publicPaths?: ReadonlyArray<Path> } = {}
) =>
  Layer.effect(
    PathSharing,
    Effect.gen(function*() {
      const store = yield* Ref.make<Record<string, SharedWith>>(seed.shared ?? {})
      const known = new Map(Object.values(seed.shared ?? {}).flatMap((s) => s.people).map((p) => [p.email, p]))
      const of = (id: PathId) => Effect.map(Ref.get(store), (all) => all[id] ?? { people: [], invites: [] })
      const save = (id: PathId, shared: SharedWith) => Ref.update(store, (all) => ({ ...all, [id]: shared }))

      return PathSharing.of({
        shares: of,
        share: Effect.fn("MemoryPathSharing.share")(function*(id, edit) {
          const { people, invites } = yield* of(id)
          const person = known.get(edit.email)
          if (!person) {
            const invite: PathInvite = { email: edit.email.toLowerCase(), role: edit.role }
            yield* save(id, { people, invites: [...invites.filter((i) => i.email !== invite.email), invite] })
            return invite
          }
          const share: PathShare = { ...person, role: edit.role }
          yield* save(id, { people: [...people.filter((p) => p.email !== edit.email), share], invites })
          return share
        }),
        unshare: (id, userId) => Effect.flatMap(of(id), (s) => save(id, { ...s, people: s.people.filter((p) => p.userId !== userId) })),
        cancelInvite: (id, email) => Effect.flatMap(of(id), (s) => save(id, { ...s, invites: s.invites.filter((i) => i.email !== email) })),
        setVisibility: () => Effect.void,
        take: () => Effect.void,
        leave: () => Effect.void,
        requestPublication: () => Effect.void,
        withdrawPublication: () => Effect.void,
        readPublic: (id) => {
          const path = seed.publicPaths?.find((p) => p.id === id)
          return path ? Effect.succeed(path) : Effect.fail(new PathNotFound({ pathId: id }))
        },
        readPublished: (slug) => {
          const path = seed.publicPaths?.find((p) => p.visibility === "published" && p.slug === slug)
          return path ? Effect.succeed(path) : Effect.fail(new PathNotFound({ pathId: slug }))
        }
      })
    })
  )

/** Someone a path is shared with, for tests: a viewer unless told otherwise; the id and email follow the name */
export const aShare = (fields: Partial<PathShare> & { readonly name: string }): PathShare => ({
  userId: UserId.make(fields.name.toLowerCase()),
  email: `${fields.name.toLowerCase()}@wisepath.test`,
  role: "viewer",
  ...fields
})
