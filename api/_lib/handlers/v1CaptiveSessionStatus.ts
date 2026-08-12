import { wrapWebHandlers } from "../webHandlerAdapter.js";
import { GET, POST, PATCH } from "../../../app/api/v1/captive/session-status/route.js";

export default wrapWebHandlers({ GET, POST, PATCH });
