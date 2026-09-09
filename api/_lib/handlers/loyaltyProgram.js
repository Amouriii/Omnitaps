import { createClient } from "@supabase/supabase-js";
import { requireProfileForEnterprise } from "../../../lib/wifi/profiles-auth.js";
import { enforceRateLimit, methodNotAllowed, readJsonBody, sanitizeText, sendJson } from "../security.js";

function serviceClient() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function bearer(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token.trim() : null;
}

async function authUser(supabase, req) {
  const token = bearer(req);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data?.user ? null : data.user;
}

function clean(value, max = 160) {
  return sanitizeText(value, { maxLength: max });
}

function int(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function jsonProgram(row) {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    name: String(row.name),
    pointsName: String(row.points_name),
    earnRate: Number(row.earn_rate),
    welcomePoints: Number(row.welcome_points),
    primaryColor: String(row.primary_color),
    isActive: Boolean(row.is_active),
  };
}

function jsonReward(row) {
  return {
    id: String(row.id),
    programId: String(row.program_id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    valueText: row.value_text == null ? null : String(row.value_text),
    pointsCost: Number(row.points_cost),
    sortOrder: Number(row.sort_order),
    isActive: Boolean(row.is_active),
  };
}

function jsonMember(row) {
  return {
    id: String(row.id),
    programId: String(row.program_id),
    memberNumber: String(row.member_number),
    firstName: String(row.first_name),
    lastName: row.last_name == null ? null : String(row.last_name),
    email: row.email == null ? null : String(row.email),
    pointsBalance: Number(row.points_balance),
    lifetimePoints: Number(row.lifetime_points),
    tier: String(row.tier),
    status: String(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function jsonTransaction(row) {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    rewardId: row.reward_id == null ? null : String(row.reward_id),
    transactionType: String(row.transaction_type),
    pointsChange: Number(row.points_change),
    description: String(row.description),
    createdAt: String(row.created_at),
  };
}

async function resolveEnterpriseId(supabase, req, body) {
  const raw = clean(body.enterprise_id || body.enterpriseId || body.enterprise_slug || body.slug, 120) || clean(req.query?.enterprise_id, 120) || clean(req.query?.enterprise_slug, 120);
  if (!raw) return null;
  const bySlug = await supabase.from("enterprises").select("id").eq("slug", raw).maybeSingle();
  if (bySlug.data?.id) return String(bySlug.data.id);
  const byId = await supabase.from("enterprises").select("id").eq("id", raw).maybeSingle();
  return byId.data?.id ? String(byId.data.id) : null;
}

async function requireAdmin(supabase, req, body, write = true) {
  const user = await authUser(supabase, req);
  if (!user) return { response: { status: 401, body: { error: "Valid Bearer access token required.", code: "UNAUTHORIZED" } } };
  const enterpriseId = await resolveEnterpriseId(supabase, req, body);
  if (!enterpriseId) return { response: { status: 400, body: { error: "enterprise_id or enterprise_slug is required.", code: "BAD_REQUEST" } } };
  const access = await requireProfileForEnterprise(supabase, user, enterpriseId, write);
  if (!access.ok) return { response: { status: access.status, body: { error: access.error, code: access.code, details: access.details } } };
  return { enterpriseId, role: access.membership.role };
}

async function load(supabase, enterpriseId) {
  const programResult = await supabase.from("loyalty_programs").select("*").eq("enterprise_id", enterpriseId).maybeSingle();
  if (programResult.error) throw programResult.error;
  if (!programResult.data) return { program: null, rewards: [], members: [], transactions: [] };
  const programId = programResult.data.id;
  const [rewards, members] = await Promise.all([
    supabase.from("loyalty_rewards").select("*").eq("program_id", programId).order("sort_order").order("created_at", { ascending: false }),
    supabase.from("loyalty_members").select("*").eq("program_id", programId).order("created_at", { ascending: false }),
  ]);
  if (rewards.error) throw rewards.error;
  if (members.error) throw members.error;
  const memberIds = (members.data || []).map((row) => row.id);
  const transactions = memberIds.length
    ? await supabase.from("loyalty_transactions").select("*").in("member_id", memberIds).order("created_at", { ascending: false }).limit(50)
    : { data: [], error: null };
  if (transactions.error) throw transactions.error;
  return { program: programResult.data, rewards: rewards.data || [], members: members.data || [], transactions: transactions.data || [] };
}

function responseError(res, result) {
  sendJson(res, result.response.status, result.response.body);
}

export default async function handler(req, res) {
  if (!enforceRateLimit(req, res, { keyPrefix: "loyalty-program", max: 90 })) return;
  const supabase = serviceClient();
  if (!supabase) {
    sendJson(res, 503, { error: "Loyalty storage is not configured.", code: "LOYALTY_UNAVAILABLE" });
    return;
  }
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    methodNotAllowed(res, ["GET", "POST", "PATCH"]);
    return;
  }

  let body = {};
  if (req.method !== "GET") {
    try { body = await readJsonBody(req); } catch { sendJson(res, 400, { error: "Invalid JSON body.", code: "BAD_REQUEST" }); return; }
  }
  const admin = await requireAdmin(supabase, req, body, req.method !== "GET");
  if (admin.response) { responseError(res, admin); return; }

  try {
    if (req.method === "GET") {
      const data = await load(supabase, admin.enterpriseId);
      sendJson(res, 200, { ok: true, role: admin.role, program: data.program ? jsonProgram(data.program) : null, rewards: data.rewards.map(jsonReward), members: data.members.map(jsonMember), transactions: data.transactions.map(jsonTransaction) });
      return;
    }

    const action = clean(body.action, 40);
    const existing = await supabase.from("loyalty_programs").select("*").eq("enterprise_id", admin.enterpriseId).maybeSingle();
    if (existing.error) throw existing.error;

    if (action === "save_program") {
      const input = {
        enterprise_id: admin.enterpriseId,
        name: clean(body.name, 120),
        points_name: clean(body.points_name || body.pointsName, 32) || "points",
        earn_rate: Number(body.earn_rate ?? body.earnRate ?? 1),
        welcome_points: int(body.welcome_points ?? body.welcomePoints, 0),
        primary_color: clean(body.primary_color || body.primaryColor, 7) || "#155eef",
        is_active: body.is_active !== false && body.isActive !== false,
      };
      if (!input.name) { sendJson(res, 400, { error: "Program name is required.", code: "BAD_REQUEST" }); return; }
      const result = await supabase.from("loyalty_programs").upsert(input, { onConflict: "enterprise_id" }).select("*").single();
      if (result.error) throw result.error;
      sendJson(res, 200, { ok: true, program: jsonProgram(result.data) });
      return;
    }

    if (action === "save_reward") {
      if (!existing.data?.id) { sendJson(res, 400, { error: "Save the loyalty program first.", code: "PROGRAM_REQUIRED" }); return; }
      const input = {
        program_id: existing.data.id,
        name: clean(body.name, 120),
        description: clean(body.description, 240) || null,
        value_text: clean(body.value_text || body.valueText, 80) || null,
        points_cost: int(body.points_cost ?? body.pointsCost, 0),
        sort_order: int(body.sort_order ?? body.sortOrder, 0),
        is_active: body.is_active !== false && body.isActive !== false,
      };
      if (!input.name || input.points_cost < 1) { sendJson(res, 400, { error: "Reward name and points cost are required.", code: "BAD_REQUEST" }); return; }
      const result = await supabase.from("loyalty_rewards").insert(input).select("*").single();
      if (result.error) throw result.error;
      sendJson(res, 201, { ok: true, reward: jsonReward(result.data) });
      return;
    }

    if (!existing.data?.id) { sendJson(res, 400, { error: "Save the loyalty program first.", code: "PROGRAM_REQUIRED" }); return; }

    if (action === "create_member") {
      const firstName = clean(body.first_name || body.firstName, 100);
      const memberNumber = clean(body.member_number || body.memberNumber, 80);
      if (!firstName || !memberNumber) { sendJson(res, 400, { error: "first_name and member_number are required.", code: "BAD_REQUEST" }); return; }
      const welcomePoints = int(body.welcome_points ?? body.welcomePoints, Number(existing.data.welcome_points) || 0);
      const result = await supabase.from("loyalty_members").insert({ program_id: existing.data.id, first_name: firstName, last_name: clean(body.last_name || body.lastName, 100) || null, member_number: memberNumber, email: clean(body.email, 254).toLowerCase() || null, tier: clean(body.tier, 60) || "Member", points_balance: welcomePoints, lifetime_points: welcomePoints }).select("*").single();
      if (result.error) throw result.error;
      if (welcomePoints > 0) {
        await supabase.from("loyalty_transactions").insert({ member_id: result.data.id, transaction_type: "earn", points_change: welcomePoints, description: "Welcome bonus" });
      }
      sendJson(res, 201, { ok: true, member: jsonMember(result.data) });
      return;
    }

    if (action === "award_points") {
      const memberId = clean(body.member_id || body.memberId, 120);
      const points = int(body.points, 0);
      if (!memberId || points < 1) { sendJson(res, 400, { error: "member_id and positive points are required.", code: "BAD_REQUEST" }); return; }
      const memberCheck = await supabase.from("loyalty_members").select("id, program_id, loyalty_programs!inner(enterprise_id)").eq("id", memberId).maybeSingle();
      if (memberCheck.error || !memberCheck.data || memberCheck.data.loyalty_programs?.enterprise_id !== admin.enterpriseId) { sendJson(res, 404, { error: "Member not found.", code: "MEMBER_NOT_FOUND" }); return; }
      const rpc = await supabase.rpc("loyalty_award_points", { p_member_id: memberId, p_points: points, p_description: clean(body.description, 160) || "Points earned", p_idempotency_key: clean(body.idempotency_key || body.idempotencyKey, 120) || null });
      if (rpc.error) throw rpc.error;
      sendJson(res, 200, { ok: true, member: jsonMember(Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) });
      return;
    }

    if (action === "redeem_reward") {
      const memberId = clean(body.member_id || body.memberId, 120);
      const rewardId = clean(body.reward_id || body.rewardId, 120);
      if (!memberId || !rewardId) { sendJson(res, 400, { error: "member_id and reward_id are required.", code: "BAD_REQUEST" }); return; }
      const [memberCheck, rewardCheck] = await Promise.all([
        supabase.from("loyalty_members").select("id, program_id, loyalty_programs!inner(enterprise_id)").eq("id", memberId).maybeSingle(),
        supabase.from("loyalty_rewards").select("id, program_id").eq("id", rewardId).eq("is_active", true).maybeSingle(),
      ]);
      if (memberCheck.error || rewardCheck.error || !memberCheck.data || !rewardCheck.data || memberCheck.data.loyalty_programs?.enterprise_id !== admin.enterpriseId || memberCheck.data.program_id !== rewardCheck.data.program_id) { sendJson(res, 404, { error: "Member or reward not found.", code: "REWARD_NOT_FOUND" }); return; }
      const rpc = await supabase.rpc("loyalty_redeem_reward", { p_member_id: memberId, p_reward_id: rewardId, p_idempotency_key: clean(body.idempotency_key || body.idempotencyKey, 120) || null });
      if (rpc.error) throw rpc.error;
      sendJson(res, 200, { ok: true, member: jsonMember(Array.isArray(rpc.data) ? rpc.data[0] : rpc.data) });
      return;
    }

    sendJson(res, 400, { error: "Unknown loyalty action.", code: "BAD_REQUEST" });
  } catch (error) {
    const message = error?.message || "Unable to save loyalty program.";
    const code = message.includes("INSUFFICIENT_POINTS") ? "INSUFFICIENT_POINTS" : message.includes("REWARD_NOT_FOUND") ? "REWARD_NOT_FOUND" : "DB_ERROR";
    sendJson(res, 400, { error: code === "INSUFFICIENT_POINTS" ? "This member does not have enough points." : "Unable to complete loyalty action.", code, details: process.env.NODE_ENV === "production" ? undefined : message });
  }
}
