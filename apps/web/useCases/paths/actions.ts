"use server"

import { revalidatePath } from "next/cache"
import type { Path, ShareResult } from "@wisepath/domain/paths"
import type { Translate } from "@/i18n/I18nProvider"
import { ADMIN_PUBLICATIONS, HOME } from "@/shared/routes"
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

export async function createPath(title: string, projectId: string): Promise<ActionResult<Path>> {
  const result = await runAction(programs.createPath({ title, projectId }), (t) => ({
    PathsUnavailable: t("common.errors.unavailable"),
    ProjectNotFound: t("home.errors.projectGone")
  }))
  if (result.ok) revalidatePath(HOME)
  return result
}

/** The sample path, copied into the learner's default project */
export async function takeSamplePath(): Promise<ActionResult<Path>> {
  const result = await runAction(programs.takeSample, (t) => ({ PathsUnavailable: t("common.errors.unavailable") }))
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

/** With the account that has the email, or an invite kept until someone signs up with it */
export async function sharePath(pathId: string, email: string, role: string): Promise<ActionResult<ShareResult>> {
  return runAction(programs.sharePath(pathId, { email, role }), (t) => ({ ...gone(t), CannotShareWithSelf: t("share.errors.self") }))
}

export async function cancelInvite(pathId: string, email: string): Promise<ActionResult<void>> {
  return runAction(programs.cancelInvite(pathId, email), gone)
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

/** A notice of a lost path, once shown */
export async function dismissNotice(noticeId: string): Promise<ActionResult<void>> {
  return runAction(programs.dismissNotice(noticeId), (t) => ({ PathsUnavailable: t("common.errors.unavailable") }))
}

export async function requestPublication(pathId: string, request: unknown): Promise<ActionResult<void>> {
  return runAction(programs.requestPublication(pathId, request), gone)
}

export async function withdrawPublication(pathId: string): Promise<ActionResult<void>> {
  return runAction(programs.withdrawPublication(pathId), gone)
}

/** An administrator's decision on a request to publish; the review page reads the requests again */
export async function decidePublication(pathId: string, approve: boolean): Promise<ActionResult<void>> {
  const result = await runAction(programs.decidePublication(pathId, approve), (t) => ({
    PathNotFound: t("admin.publications.decided"),
    PathsUnavailable: t("common.errors.unavailable")
  }))
  if (result.ok) revalidatePath(ADMIN_PUBLICATIONS)
  return result
}
