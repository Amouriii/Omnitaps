import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const defaultLeads = new URL("../ops/outreach/leads.json", import.meta.url);
const stages = {
  researched: "Review first approach",
  contacted: "Check reply and follow-up date",
  replied: "Qualify and offer a demo",
  demo_booked: "Prepare one-location walkthrough",
  proposal_sent: "Confirm decision date",
  won: "Onboard",
  lost: "Close",
  opted_out: "Suppress",
  deferred: "Hold",
};
const outreachStages = new Set(["contacted", "replied", "demo_booked", "proposal_sent", "won"]);
const terminalStages = new Set(["deferred", "won", "lost", "opted_out"]);

function validateLeads(leads) {
  if (!Array.isArray(leads) || leads.length === 0) {
    throw new Error("The lead file must contain a nonempty array.");
  }
  const ids = new Set();
  for (const lead of leads) {
    if (!lead || typeof lead.id !== "string" || !/^[a-z0-9-]+$/.test(lead.id) || ids.has(lead.id)) {
      throw new Error("Each prospect must have a unique lowercase ID.");
    }
    ids.add(lead.id);
    if (!Object.hasOwn(stages, lead.stage)) {
      throw new Error(`Invalid stage for ${lead.id}.`);
    }
    for (const key of ["name", "area", "evidence", "source", "approach"]) {
      if (typeof lead[key] !== "string" || !lead[key].trim()) {
        throw new Error(`Missing ${key} for ${lead.id}.`);
      }
    }
    if (new URL(lead.source).protocol !== "https:") {
      throw new Error(`Use an HTTPS source for ${lead.id}.`);
    }
    if (lead.stage === "researched" && (!lead.draft?.trim() || !Number.isInteger(lead.priority) || lead.priority < 1)) {
      throw new Error(`Add a draft and positive priority for ${lead.id}.`);
    }
    if (!["researched", "deferred"].includes(lead.stage) && !lead.stageEvidence?.trim()) {
      throw new Error(`Record stage evidence for ${lead.id}.`);
    }
  }
}

function render(leads, date) {
  const queue = leads
    .filter((lead) => lead.stage === "researched")
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
  const contacted = leads.filter((lead) => outreachStages.has(lead.stage)).length;
  const won = leads.filter((lead) => lead.stage === "won").length;
  const lines = [
    "# Omnitaps outreach queue",
    "",
    `Prepared ${date} in Africa/Cairo.`,
    "",
    `**${leads.length} businesses researched · ${queue.length} first approaches drafted · ${contacted} contacted or progressed · ${won} paid wins recorded**`,
    "",
    "The queue prepares outreach for review and records pipeline state. A prospect advances when there is evidence for the new stage.",
  ];

  for (const lead of queue) {
    lines.push(
      "",
      `## ${lead.name} · ${lead.area}`,
      "",
      lead.evidence,
      lead.approach,
      `[Public source](${lead.source})`,
      "",
      ...lead.draft.split("\n").map((line) => `> ${line}`),
    );
  }

  const otherLeads = leads.filter((lead) => lead.stage !== "researched");
  if (otherLeads.length > 0) {
    lines.push("", "## Other pipeline records", "");
  }
  for (const lead of otherLeads) {
    const next = terminalStages.has(lead.stage) ? stages[lead.stage] : (lead.nextAction || stages[lead.stage]);
    lines.push(`- **${lead.name}** · ${lead.stage} · ${next}. ${lead.stageEvidence || lead.approach} [Public source](${lead.source})`);
  }
  return `${lines.join("\n")}\n`;
}

try {
  const { values } = parseArgs({
    options: { leads: { type: "string" }, date: { type: "string" } },
  });
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Cairo" }).format(new Date());
  const date = values.date ?? today;
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error("Use a valid date in YYYY-MM-DD format.");
  }
  const leads = JSON.parse(await readFile(values.leads ?? defaultLeads, "utf8"));
  validateLeads(leads);
  process.stdout.write(render(leads, date));
} catch (error) {
  process.stderr.write(`Outreach queue failed: ${error.message}\n`);
  process.exitCode = 1;
}
