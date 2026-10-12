import { HttpApi } from "effect/http-api"
import { AuthApiGroup } from "./AuthApi"

/** The WisePath HTTP API. Clients prepend the base URL (e.g. http://localhost:3001/api). */
export class WisePathApi extends HttpApi.make("wisepath").add(AuthApiGroup) {}
