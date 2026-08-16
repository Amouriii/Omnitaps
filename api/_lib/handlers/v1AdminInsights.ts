import { wrapWebHandlers } from "../webHandlerAdapter.js";
import { GET } from "../../../app/api/v1/admin/insights/route.js";

export default wrapWebHandlers({ GET });
