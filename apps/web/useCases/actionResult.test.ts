import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { Auth, AuthUnavailable } from "@wisepath/domain/auth"
import type { Translate } from "@/i18n/I18nProvider"
import { translate } from "@/i18n/format"
import type { Locale } from "@/i18n/locales"
import { en } from "@/i18n/messages/en"
import { ptBR } from "@/i18n/messages/pt-BR"
import { MemoryAuth } from "@/infrastructure/auth/MemoryAuth"
import { MemoryProjectRepository, aProject } from "@/infrastructure/projects/MemoryProjectRepository"
import { actionAnswer } from "./actionResult"
import * as auth from "./auth/programs"
import * as projects from "./projects/programs"

/**
 * What a Server Action answers, from the session check to the sentence shown:
 * the same steps runAction takes, on in-memory services.
 */

const ada = { email: "ada@example.com", password: "correct-horse", name: "Ada" }
const general = aProject({ name: "General", isDefault: true })
const services = Layer.mergeAll(MemoryAuth([ada]), MemoryProjectRepository([general]))

/** Auth whose API can't be reached: every call fails as it would with the network down */
const unreachableAuth = Layer.succeed(Auth)(
  Auth.of({
    login: () => Effect.fail(new AuthUnavailable({ cause: "offline" })),
    signup: () => Effect.fail(new AuthUnavailable({ cause: "offline" })),
    logout: () => Effect.fail(new AuthUnavailable({ cause: "offline" })),
    currentUser: () => Effect.fail(new AuthUnavailable({ cause: "offline" })),
    updateSettings: () => Effect.fail(new AuthUnavailable({ cause: "offline" }))
  })
)

const translator = (locale: Locale): Translate => (key, values) => translate(locale === "pt-BR" ? ptBR : en, en, locale, key, values)

/** The action's answer for this program, in the given language, as runAction gets it */
const answer = <A, E extends { readonly _tag: string }, R>(program: Effect.Effect<A, E, R>, locale: Locale = "en") => {
  const t = translator(locale)
  return actionAnswer(program, t, { ProjectsUnavailable: t("common.errors.unavailable") })
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

  it.effect("says the API can't be reached when the session check finds it down", () =>
    Effect.gen(function*() {
      const result = yield* answer(projects.listProjects)
      assert.deepStrictEqual(result, { ok: false, _tag: "AuthUnavailable", message: en.common.errors.unavailable })
    }).pipe(Effect.provide(Layer.mergeAll(unreachableAuth, MemoryProjectRepository([general])))))

  it.effect("hides a defect behind the generic sentence", () =>
    Effect.gen(function*() {
      yield* loggedIn
      const result = yield* answer(Effect.die(new Error("database password is hunter2")))
      assert.deepStrictEqual(result, { ok: false, _tag: "Defect", message: en.common.errors.generic })
    }).pipe(Effect.provide(services)))
})
