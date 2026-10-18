"use server"

import { revalidatePath } from "next/cache"
import type { Path, PathShare } from "@wisepath/domain/paths"
import type { Translate } from "@/i18n/I18nProvider"
import { HOME } from "@/shared/routes"
import type { ActionResult } from "../actionResult"
import { runAction } from "../server"
import * as programs from "./programs"

/**
 * Path mutations as Server Actions: making, moving, deleting a map and
 * switching its kind, and sharing. Public endpoints, so each one checks the
 * session (runAction) and decodes what it is sent (the programs) before
 * writing. What changes the paths page renders it again.
 */

const gone = (t: Translate) => ({ PathNotFound: t("share.errors.gone"), PathsUnavailable: t("common.errors.unavailable") })

export async function createPath(title: string, kind: string, projectId: string): Promise<ActionResult<Path>> {
  const result = await runAction(programs.createPath({ title, kind, projectId }), (t) => ({
    PathsUnavailable: t("common.errors.unavailable"),
    ProjectNotFound: t("home.errors.projectGone")
  }))
  if (result.ok) revalidatePath(HOME)
  return result
}

export async function movePath(pathId: string, projectId: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.movePath(pathId, projectId), (t) => ({
    PathsUnavailable: t("common.errors.unavailable"),
    PathNotFound: t("home.errors.pathGone"),
    ProjectNotFound: t("home.errors.projectGone")
  }))
  if (result.ok) revalidatePath(HOME)
  return result
}

export async function setPathKind(pathId: string, kind: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.setPathKind(pathId, kind), (t) => ({
    PathsUnavailable: t("common.errors.unavailable"),
    PathNotFound: t("home.errors.pathGone")
  }))
  if (result.ok) revalidatePath(HOME)
  return result
}

export async function removePath(pathId: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.removePath(pathId), (t) => ({ PathsUnavailable: t("common.errors.unavailable") }))
  if (result.ok) revalidatePath(HOME)
  return result
}

export async function sharePath(pathId: string, email: string, role: string): Promise<ActionResult<PathShare>> {
  return runAction(programs.sharePath(pathId, { email, role }), (t) => ({
    ...gone(t),
    ShareTargetNotFound: t("share.errors.noAccount"),
    CannotShareWithSelf: t("share.errors.self")
  }))
}

export async function unsharePath(pathId: string, userId: string): Promise<ActionResult<void>> {
  return runAction(programs.unsharePath(pathId, userId), gone)
}

export async function setPathVisibility(pathId: string, visibility: string): Promise<ActionResult<void>> {
  return runAction(programs.setVisibility(pathId, visibility), gone)
}

export async function takePath(pathId: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.takePath(pathId), gone)
  if (result.ok) revalidatePath(HOME)
  return result
}

export async function leavePath(pathId: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.leavePath(pathId), gone)
  if (result.ok) revalidatePath(HOME)
  return result
}
