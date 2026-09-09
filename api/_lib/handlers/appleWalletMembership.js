import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  createAppleWalletPass,
  PASS_CONTENT_TYPE,
} from "../appleWalletPass.js";
import { requireProfileForEnterprise } from "../../../lib/wifi/profiles-auth.js";
import {
  enforceRateLimit,
  methodNotAllowed,
  readJsonBody,
  sanitizeText,
  sendJson,
} from "../security.js";

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

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function value(req, key) {
  const candidate = req.query?.[key];
  return typeof candidate === "string" ? candidate.trim() : "";
}

function clean(valueToClean, max = 160) {
  return sanitizeText(valueToClean, { maxLength: max });
}

function email(valueToClean) {
  const result = clean(valueToClean, 254).toLowerCase();
  return result && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : null;
}

function jsonProgram(row) {
  return {
    id: String(row.id),
    enterpriseId: String(row.enterprise_id),
    name: String(row.name),
    programType: String(row.program_type),
    logoText: row.logo_text == null ? null : String(row.logo_text),
    logoUrl: row.logo_url == null ? null : String(row.logo_url),
    primaryColor: String(row.primary_color),
    backgroundColor: String(row.background_color),
    labelColor: String(row.label_color),
    barcodeFormat: String(row.barcode_format),
    supportUrl: row.support_url == null ? null : String(row.support_url),
    isActive: Boolean(row.is_active),
  };
}

function isExpired(row) {
  return Boolean(row.expires_at && String(row.expires_at) < new Date().toISOString().slice(0, 10));
}

function jsonMember(row, downloadToken = null) {
  const payload = {
    id: String(row.id),
    programId: String(row.program_id),
    memberNumber: String(row.member_number),
    firstName: String(row.first_name),
    lastName: row.last_name == null ? null : String(row.last_name),
    email: row.email == null ? null : String(row.email),
    tier: row.tier == null ? null : String(row.tier),
    expiresAt: row.expires_at == null ? null : String(row.expires_at),
    status: isExpired(row) && row.status === "active" ? "expired" : String(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
  return downloadToken
    ? {
        ...payload,
        downloadToken,
        downloadPath: `/api/wallet/membership/${encodeURIComponent(downloadToken)}`,
      }
    : payload;
}

async function resolveEnterpriseId(supabase, req, body = {}) {
  const raw =
    clean(body.enterprise_id || body.enterpriseId || body.enterprise_slug || body.slug, 120) ||
    value(req, "enterprise_id") || value(req, "enterprise_slug") || value(req, "slug");
  if (!raw) return null;
  const bySlug = await supabase.from("enterprises").select("id").eq("slug", raw).maybeSingle();
  if (bySlug.data?.id) return String(bySlug.data.id);
  const byId = await supabase.from("enterprises").select("id").eq("id", raw).maybeSingle();
  return byId.data?.id ? String(byId.data.id) : null;
}

async function enterpriseForCaller(supabase, user, req, body) {
  const explicit = await resolveEnterpriseId(supabase, req, body);
  if (explicit) return explicit;
  const profile = await supabase
    .from("profiles")
    .select("enterprise_id")
    .eq("id", user.id)
    .maybeSingle();
  return profile.data?.enterprise_id ? String(profile.data.enterprise_id) : null;
}

async function requireAdmin(supabase, req, body = {}, requireWrite = true) {
  const user = await authUser(supabase, req);
  if (!user) return { response: { status: 401, body: { error: "Valid Bearer access token required.", code: "UNAUTHORIZED" } } };
  const enterpriseId = await enterpriseForCaller(supabase, user, req, body);
  if (!enterpriseId) return { response: { status: 400, body: { error: "enterprise_id or enterprise_slug is required.", code: "BAD_REQUEST" } } };
  const access = await requireProfileForEnterprise(supabase, user, enterpriseId, requireWrite);
  if (!access.ok) return { response: { status: access.status, body: { error: access.error, code: access.code, details: access.details } } };
  return { user, enterpriseId, role: access.membership.role };
}

function responseError(res, result) {
  sendJson(res, result.response.status, result.response.body);
}

async function publicPass(req, res, supabase, token) {
  if (!token || token.length < 32 || token.length > 200) {
    sendJson(res, 404, { error: "Membership pass not found.", code: "PASS_NOT_FOUND" });
    return;
  }
  const { data: member, error } = await supabase
    .from("apple_wallet_members")
    .select("*")
    .eq("access_token_hash", hashToken(token))
    .maybeSingle();
  const programResult = member
    ? await supabase.from("apple_wallet_programs").select("*").eq("id", member.program_id).maybeSingle()
    : { data: null, error: null };
  const program = programResult.data;
  if (error || programResult.error || !member || !program || !program.is_active || member.status !== "active" || isExpired(member)) {
    sendJson(res, 404, { error: "Membership pass not found or inactive.", code: "PASS_NOT_FOUND" });
    return;
  }

  try {
    const pass = createAppleWalletPass({ program, member, authToken: token });
    res.statusCode = 200;
    res.setHeader("Content-Type", PASS_CONTENT_TYPE);
    res.setHeader("Content-Disposition", `attachment; filename="${pass.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.end(pass.buffer);
  } catch (generationError) {
    const message = generationError instanceof Error ? generationError.message : "Pass generation failed.";
    sendJson(res, 503, { error: message, code: "WALLET_SIGNING_UNAVAILABLE" });
  }
}

async function loadProgramAndMembers(supabase, enterpriseId) {
  const programResult = await supabase
    .from("apple_wallet_programs")
    .select("*")
    .eq("enterprise_id", enterpriseId)
    .maybeSingle();
  if (programResult.error) throw programResult.error;
  const program = programResult.data;
  if (!program) return { program: null, members: [], error: null };
  const members = await supabase
    .from("apple_wallet_members")
    .select("*")
    .eq("program_id", program.id)
    .order("created_at", { ascending: false });
  return { program, members: members.data || [], error: members.error };
}

export default async function handler(req, res) {
  if (!enforceRateLimit(req, res, { keyPrefix: "apple-wallet", max: 60 })) return;
  const supabase = serviceClient();
  if (!supabase) {
    sendJson(res, 503, { error: "Wallet storage is not configured.", code: "WALLET_UNAVAILABLE" });
    return;
  }

  const token = value(req, "token") || value(req, "memberToken");
  if (token) {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    await publicPass(req, res, supabase, token);
    return;
  }

  let body = {};
  if (["POST", "PATCH"].includes(req.method)) {
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body.", code: "BAD_REQUEST" });
      return;
    }
  }

  if (req.method === "GET") {
    const admin = await requireAdmin(supabase, req, {}, false);
    if (admin.response) {
      responseError(res, admin);
      return;
    }
    try {
      const loaded = await loadProgramAndMembers(supabase, admin.enterpriseId);
      if (loaded.error) throw loaded.error;
      sendJson(res, 200, {
        ok: true,
        role: admin.role,
        program: loaded.program ? jsonProgram(loaded.program) : null,
        members: loaded.members.map((member) => jsonMember(member)),
      });
    } catch (error) {
      sendJson(res, 500, { error: "Unable to load wallet membership.", code: "DB_ERROR", details: error?.message });
    }
    return;
  }

  const admin = await requireAdmin(supabase, req, body);
  if (admin.response) {
    responseError(res, admin);
    return;
  }

  if (req.method === "POST") {
    const action = clean(body.action, 40) || "create_member";
    try {
      if (action === "save_program") {
        const input = {
          enterprise_id: admin.enterpriseId,
          name: clean(body.name, 120),
          program_type: clean(body.program_type || body.programType, 40) || "membership",
          logo_text: clean(body.logo_text || body.logoText, 80) || "Omnitaps",
          logo_url: clean(body.logo_url || body.logoUrl, 500) || null,
          primary_color: clean(body.primary_color || body.primaryColor, 7) || "#155eef",
          background_color: clean(body.background_color || body.backgroundColor, 7) || "#12151a",
          label_color: clean(body.label_color || body.labelColor, 7) || "#ffffff",
          barcode_format: clean(body.barcode_format || body.barcodeFormat, 20).toUpperCase() || "QR",
          support_url: clean(body.support_url || body.supportUrl, 500) || null,
          is_active: body.is_active !== false && body.isActive !== false,
        };
        if (!input.name) {
          sendJson(res, 400, { error: "Program name is required.", code: "BAD_REQUEST" });
          return;
        }
        const result = await supabase
          .from("apple_wallet_programs")
          .upsert(input, { onConflict: "enterprise_id" })
          .select("*")
          .single();
        if (result.error) throw result.error;
        sendJson(res, 200, { ok: true, program: jsonProgram(result.data) });
        return;
      }

      if (action === "issue_link") {
        const memberId = clean(body.member_id || body.memberId, 120);
        if (!memberId) {
          sendJson(res, 400, { error: "member_id is required.", code: "BAD_REQUEST" });
          return;
        }
        const program = await supabase
          .from("apple_wallet_programs")
          .select("id")
          .eq("enterprise_id", admin.enterpriseId)
          .maybeSingle();
        if (program.error || !program.data) throw program.error || new Error("Program not found");
        const rawToken = randomBytes(32).toString("hex");
        const result = await supabase
          .from("apple_wallet_members")
          .update({ access_token_hash: hashToken(rawToken) })
          .eq("id", memberId)
          .eq("program_id", program.data.id)
          .select("*")
          .maybeSingle();
        if (result.error || !result.data) throw result.error || new Error("Member not found");
        sendJson(res, 200, { ok: true, member: jsonMember(result.data, rawToken) });
        return;
      }

      const program = await supabase
        .from("apple_wallet_programs")
        .select("id")
        .eq("enterprise_id", admin.enterpriseId)
        .maybeSingle();
      if (program.error) throw program.error;
      if (!program.data) {
        sendJson(res, 400, { error: "Save a wallet program before adding members.", code: "PROGRAM_REQUIRED" });
        return;
      }
      const firstName = clean(body.first_name || body.firstName, 100);
      const memberNumber = clean(body.member_number || body.memberNumber, 80);
      if (!firstName || !memberNumber) {
        sendJson(res, 400, { error: "first_name and member_number are required.", code: "BAD_REQUEST" });
        return;
      }
      const rawToken = randomBytes(32).toString("hex");
      const result = await supabase
        .from("apple_wallet_members")
        .insert({
          program_id: program.data.id,
          member_number: memberNumber,
          first_name: firstName,
          last_name: clean(body.last_name || body.lastName, 100) || null,
          email: email(body.email),
          tier: clean(body.tier, 60) || null,
          expires_at: clean(body.expires_at || body.expiresAt, 10) || null,
          status: "active",
          access_token_hash: hashToken(rawToken),
        })
        .select("*")
        .single();
      if (result.error) throw result.error;
      sendJson(res, 201, { ok: true, member: jsonMember(result.data, rawToken) });
    } catch (error) {
      sendJson(res, 400, { error: "Unable to save wallet membership.", code: "DB_ERROR", details: error?.message });
    }
    return;
  }

  if (req.method === "PATCH") {
    const memberId = clean(body.member_id || body.memberId, 120);
    const programId = clean(body.program_id || body.programId, 120);
    try {
      if (memberId) {
        const program = await supabase
          .from("apple_wallet_programs")
          .select("id")
          .eq("enterprise_id", admin.enterpriseId)
          .maybeSingle();
        if (program.error || !program.data) throw program.error || new Error("Program not found");
        const patch = {};
        for (const [key, aliases, max] of [
          ["first_name", ["first_name", "firstName"], 100],
          ["last_name", ["last_name", "lastName"], 100],
          ["tier", ["tier"], 60],
          ["expires_at", ["expires_at", "expiresAt"], 10],
        ]) {
          const found = aliases.find((alias) => body[alias] !== undefined);
          if (found) patch[key] = clean(body[found], max) || null;
        }
        if (body.status !== undefined && ["active", "paused", "revoked"].includes(body.status)) patch.status = body.status;
        const result = await supabase
          .from("apple_wallet_members")
          .update(patch)
          .eq("id", memberId)
          .eq("program_id", program.data.id)
          .select("*")
          .maybeSingle();
        if (result.error || !result.data) throw result.error || new Error("Member not found");
        sendJson(res, 200, { ok: true, member: jsonMember(result.data) });
        return;
      }
      if (!programId) {
        sendJson(res, 400, { error: "member_id or program_id is required.", code: "BAD_REQUEST" });
        return;
      }
      const result = await supabase
        .from("apple_wallet_programs")
        .update({ is_active: body.is_active !== false && body.isActive !== false })
        .eq("id", programId)
        .eq("enterprise_id", admin.enterpriseId)
        .select("*")
        .maybeSingle();
      if (result.error || !result.data) throw result.error || new Error("Program not found");
      sendJson(res, 200, { ok: true, program: jsonProgram(result.data) });
    } catch (error) {
      sendJson(res, 400, { error: "Unable to update wallet membership.", code: "DB_ERROR", details: error?.message });
    }
    return;
  }

  if (req.method === "DELETE") {
    const memberId = value(req, "member_id") || value(req, "memberId");
    if (!memberId) {
      sendJson(res, 400, { error: "member_id query param is required.", code: "BAD_REQUEST" });
      return;
    }
    const program = await supabase
      .from("apple_wallet_programs")
      .select("id")
      .eq("enterprise_id", admin.enterpriseId)
      .maybeSingle();
    if (program.error || !program.data) {
      sendJson(res, 404, { error: "Wallet program not found.", code: "PROGRAM_NOT_FOUND" });
      return;
    }
    const result = await supabase
      .from("apple_wallet_members")
      .update({ status: "revoked" })
      .eq("id", memberId)
      .eq("program_id", program.data.id)
      .select("*")
      .maybeSingle();
    if (result.error || !result.data) {
      sendJson(res, 404, { error: "Member not found.", code: "MEMBER_NOT_FOUND" });
      return;
    }
    sendJson(res, 200, { ok: true, member: jsonMember(result.data) });
    return;
  }

  methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE"]);
}
