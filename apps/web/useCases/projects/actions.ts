"use server"

import { revalidatePath } from "next/cache"
import type { Project } from "@wisepath/domain/projects"
import { HOME } from "@/shared/routes"
import type { ActionResult } from "../actionResult"
import { runAction } from "../server"
import * as programs from "./programs"

/**
 * Project mutations as Server Actions: public endpoints, so each one checks the
 * session (runAction) and decodes what it is sent (the programs) before writing.
 * The paths page lists projects, so it is rendered again after each change.
 */

export async function createProject(name: string): Promise<ActionResult<Project>> {
  const result = await runAction(programs.createProject(name), (t) => ({ ProjectsUnavailable: t("common.errors.unavailable") }))
  if (result.ok) revalidatePath(HOME)
  return result
}

export async function renameProject(projectId: string, name: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.renameProject({ id: projectId, name }), (t) => ({
    ProjectsUnavailable: t("common.errors.unavailable"),
    ProjectNotFound: t("home.errors.projectGone")
  }))
  if (result.ok) revalidatePath(HOME)
  return result
}

/** Its paths move to the default project, so the paths page changes too */
export async function removeProject(projectId: string): Promise<ActionResult<void>> {
  const result = await runAction(programs.removeProject(projectId), (t) => ({
    ProjectsUnavailable: t("common.errors.unavailable"),
    DefaultProjectProtected: t("home.errors.defaultProtected")
  }))
  if (result.ok) revalidatePath(HOME)
  return result
}
