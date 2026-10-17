"use server"

import { revalidatePath } from "next/cache"
import type { PathShare } from "@wisepath/domain/paths"
import type { Translate } from "@/i18n/I18nProvider"
import { HOME } from "@/shared/routes"
import type { ActionResult } from "../actionResult"
import { runAction } from "../server"
import * as programs from "./programs"

/**
 * Sharing paths as Server Actions: public endpoints, so each one checks the
 * session (runAction) and decodes what it is sent (the programs) before
 * writing. Taking or leaving a path changes the paths page, so it is rendered again.
 */

const gone = (t: Translate) => ({ PathNotFound: t("share.errors.gone"), PathsUnavailable: t("common.errors.unavailable") })

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
