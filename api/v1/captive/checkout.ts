import { wrapWebHandlers } from "../../_lib/webHandlerAdapter.js";
import { GET, POST } from "../../../app/api/v1/captive/checkout/route.js";

/**
 * Stripe webhooks need the raw request body for signature verification.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

export default wrapWebHandlers({ GET, POST });
