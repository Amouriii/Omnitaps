import { wrapWebHandlers } from "../webHandlerAdapter.js";
import { GET } from "../../../app/api/v1/admin/wifi/telemetry/route.js";

export default wrapWebHandlers({ GET });
