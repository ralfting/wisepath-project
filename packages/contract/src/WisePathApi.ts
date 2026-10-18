import { HttpApi } from "effect/http-api"
import { AuthApiGroup } from "./AuthApi"
import { CaptureApiGroup } from "./CaptureApi"
import { LinksApiGroup } from "./LinksApi"
import { NoticesApiGroup } from "./NoticesApi"
import { AdminApiGroup, PathsApiGroup, PublicPathsApiGroup } from "./PathsApi"
import { ProjectsApiGroup } from "./ProjectsApi"
import { ReviewApiGroup } from "./ReviewApi"
import { SearchApiGroup } from "./SearchApi"

/** The WisePath HTTP API. Clients prepend the base URL (e.g. http://localhost:4001/api). */
export class WisePathApi extends HttpApi.make("wisepath")
  .add(AuthApiGroup)
  .add(ProjectsApiGroup)
  .add(PathsApiGroup)
  .add(PublicPathsApiGroup)
  .add(LinksApiGroup)
  .add(ReviewApiGroup)
  .add(SearchApiGroup)
  .add(CaptureApiGroup)
  .add(NoticesApiGroup)
  .add(AdminApiGroup) {}
