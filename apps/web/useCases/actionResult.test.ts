import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import type { Translate } from "@/i18n/I18nProvider"
import { translate } from "@/i18n/format"
import type { Locale } from "@/i18n/locales"
import { en } from "@/i18n/messages/en"
import { ptBR } from "@/i18n/messages/pt-BR"
import { MemoryAuth } from "@/infrastructure/auth/MemoryAuth"
import { MemoryProjectRepository, aProject } from "@/infrastructure/projects/MemoryProjectRepository"
import { toActionResult } from "./actionResult"
import * as auth from "./auth/programs"
import * as projects from "./projects/programs"

/**
 * What a Server Action answers, from the session check to the sentence shown:
 * the same steps runAction takes, on in-memory services.
 */

const ada = { email: "ada@example.com", password: "correct-horse", name: "Ada" }
const general = aProject({ name: "General", isDefault: true })
const services = Layer.mergeAll(MemoryAuth([ada]), MemoryProjectRepository([general]))

const translator = (locale: Locale): Translate => (key, values) => translate(locale === "pt-BR" ? ptBR : en, en, locale, key, values)

/** The action's answer for this program, as runAction builds it */
const answer = <A, E extends { readonly _tag: string }, R>(program: Effect.Effect<A, E, R>, locale: Locale = "en") => {
  const t = translator(locale)
  return Effect.exit(auth.requireSession(program)).pipe(
    // Tags are checked by runAction's own signature; here any tag may be named
    Effect.map((exit) =>
      toActionResult<A, { readonly _tag: string }>(exit, { NotAuthenticated: t("common.errors.signedOut"), ProjectsUnavailable: t("common.errors.unavailable") }, t)
    )
  )
}
const loggedIn = auth.login({ email: ada.email, password: ada.password })

describe("a Server Action's answer", () => {
  it.effect("is the value when the learner is signed in", () =>
    Effect.gen(function*() {
      yield* loggedIn
      const result = yield* answer(projects.createProject(" Languages "))
      assert.isTrue(result.ok && result.value.name === "Languages")
    }).pipe(Effect.provide(services)))

  it.effect("refuses without a session, and writes nothing", () =>
    Effect.gen(function*() {
      const result = yield* answer(projects.createProject("Languages"))
      assert.deepStrictEqual(result, { ok: false, _tag: "NotAuthenticated", message: en.common.errors.signedOut })
      yield* loggedIn
      assert.deepStrictEqual((yield* projects.listProjects).map((p) => p.name), ["General"])
    }).pipe(Effect.provide(services)))

  it.effect("shows a validation failure in the learner's language", () =>
    Effect.gen(function*() {
      yield* loggedIn
      const result = yield* answer(projects.createProject("   "), "pt-BR")
      assert.deepStrictEqual(result, { ok: false, _tag: "SchemaError", message: ptBR.home.projectForm.nameRequired })
    }).pipe(Effect.provide(services)))

  it.effect("gives a domain error its tag, with the generic sentence when none is named", () =>
    Effect.gen(function*() {
      yield* loggedIn
      const result = yield* answer(projects.removeProject(general.id))
      assert.deepStrictEqual(result, { ok: false, _tag: "DefaultProjectProtected", message: en.common.errors.generic })
    }).pipe(Effect.provide(services)))

  it.effect("hides a defect behind the generic sentence", () =>
    Effect.gen(function*() {
      yield* loggedIn
      const result = yield* answer(Effect.die(new Error("database password is hunter2")))
      assert.deepStrictEqual(result, { ok: false, _tag: "Defect", message: en.common.errors.generic })
    }).pipe(Effect.provide(services)))
})
