import { dispatchApi } from "./_lib/dispatch.js";
import { createProductionRouteTable } from "./_lib/routeTable.js";

/**
 * Sole Vercel Serverless Function. Public `/api/*` URLs are unchanged;
 * this file internally matches them and loads handlers from `_lib`.
 * bodyParser is off so Stripe checkout webhooks still see raw bytes.
 */
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};

const routes = createProductionRouteTable();

export default async function handler(req, res) {
  await dispatchApi(req, res, routes);
}
