import { wrapWebHandlers } from "../../_lib/webHandlerAdapter.js";
import { GET } from "../../../app/api/v1/admin/wifi/telemetry/route.js";

export default wrapWebHandlers({ GET });
