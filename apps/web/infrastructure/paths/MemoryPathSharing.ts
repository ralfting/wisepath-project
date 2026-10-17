import { Effect, Layer, Ref } from "effect"
import { PathNotFound, PathSharing } from "@wisepath/domain/paths"
import type { Path, PathId, PathShare } from "@wisepath/domain/paths"
import { UserId } from "@wisepath/domain/auth"

/**
 * Sharing kept in memory, for tests: the people each path is shared with, and the public paths anyone may read.
 * Follows the API's answers (sharing again changes the role, a private path is not found), except that it knows no
 * accounts: any email is someone, named after it.
 */
export const MemoryPathSharing = (seed: { readonly shares?: Record<string, ReadonlyArray<PathShare>>; readonly publicPaths?: ReadonlyArray<Path> } = {}) =>
  Layer.effect(
    PathSharing,
    Effect.gen(function*() {
      const store = yield* Ref.make<Record<string, ReadonlyArray<PathShare>>>(seed.shares ?? {})
      const of = (id: PathId) => Effect.map(Ref.get(store), (all) => all[id] ?? [])

      return PathSharing.of({
        shares: of,
        share: Effect.fn("MemoryPathSharing.share")(function*(id, edit) {
          const others = (yield* of(id)).filter((s) => s.email !== edit.email)
          const share: PathShare = { userId: UserId.make(edit.email), name: edit.email.split("@")[0], email: edit.email, role: edit.role }
          yield* Ref.update(store, (all) => ({ ...all, [id]: [...others, share] }))
          return share
        }),
        unshare: (id, userId) => Ref.update(store, (all) => ({ ...all, [id]: (all[id] ?? []).filter((s) => s.userId !== userId) })),
        setVisibility: () => Effect.void,
        take: () => Effect.void,
        leave: () => Effect.void,
        readPublic: (id) => {
          const path = seed.publicPaths?.find((p) => p.id === id)
          return path ? Effect.succeed(path) : Effect.fail(new PathNotFound({ pathId: id }))
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
