import { wrapWebHandlers } from "../webHandlerAdapter.js";
import { GET, POST } from "../../../app/api/v1/captive/checkout/route.js";

export default wrapWebHandlers({ GET, POST });
