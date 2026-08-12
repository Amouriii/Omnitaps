import { wrapWebHandlers } from "../webHandlerAdapter.js";
import { GET, PATCH, POST, DELETE } from "../../../app/api/v1/admin/wifi/settings/route.js";

export default wrapWebHandlers({ GET, PATCH, POST, DELETE });
