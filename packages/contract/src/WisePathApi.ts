import { HttpApi } from "effect/http-api"
import { AuthApiGroup } from "./AuthApi"
import { LinksApiGroup } from "./LinksApi"
import { ProjectsApiGroup } from "./ProjectsApi"
import { ReviewApiGroup } from "./ReviewApi"
import { SearchApiGroup } from "./SearchApi"

/** The WisePath HTTP API. Clients prepend the base URL (e.g. http://localhost:3001/api). */
export class WisePathApi extends HttpApi.make("wisepath")
  .add(AuthApiGroup)
  .add(ProjectsApiGroup)
  .add(LinksApiGroup)
  .add(ReviewApiGroup)
  .add(SearchApiGroup)
{}
