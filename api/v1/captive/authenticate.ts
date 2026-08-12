import { wrapWebHandlers } from "../../_lib/webHandlerAdapter.js";
import { GET, POST } from "../../../app/api/v1/captive/authenticate/route.js";

export default wrapWebHandlers({ GET, POST });
