import { wrapWebHandlers } from "../webHandlerAdapter.js";
import { POST } from "../../../app/api/v1/captive/otp/route.js";

export default wrapWebHandlers({ POST });
