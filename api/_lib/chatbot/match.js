const FALLBACK_REPLY =
  "Thanks for your message. A team member will follow up shortly. For hours, menus, and Wi‑Fi, check the links on this page.";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asObject(content) {
  if (!content) return {};
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      return parsed && typeof parsed === "object" ? parsed : { text: content };
    } catch {
      return { text: content };
    }
  }
  if (typeof content === "object") return content;
  return {};
}

function collectText(content) {
  const obj = asObject(content);
  const parts = [];
  if (typeof obj.text === "string") parts.push(obj.text);
  if (typeof obj.answer === "string") parts.push(obj.answer);
  if (Array.isArray(obj.items)) {
    for (const item of obj.items) {
      if (typeof item === "string") parts.push(item);
      else if (item?.name) {
        parts.push([item.name, item.description, item.price].filter(Boolean).join(" — "));
      }
    }
  }
  if (Array.isArray(obj.days)) {
    for (const day of obj.days) {
      parts.push([day.label, day.hours].filter(Boolean).join(": "));
    }
  }
  return parts.filter(Boolean).join("\n");
}

function collectKeywords(source) {
  const obj = asObject(source.content);
  const keywords = new Set();
  const add = (value) => {
    const normalized = normalize(value);
    if (normalized) keywords.add(normalized);
    for (const token of normalized.split(" ")) {
      if (token.length >= 3) keywords.add(token);
    }
  };

  add(source.title);
  add(source.sourceType);
  if (Array.isArray(obj.keywords)) obj.keywords.forEach(add);
  if (typeof obj.question === "string") add(obj.question);
  if (Array.isArray(obj.questions)) obj.questions.forEach(add);
  collectText(source.content)
    .split(/\s+/)
    .forEach((token) => {
      if (token.length >= 5) add(token);
    });

  return [...keywords];
}

function typeBoost(sourceType, query) {
  const type = String(sourceType || "").toUpperCase();
  if (type === "WIFI" && /(wifi|wi-?fi|password|ssid|network)/.test(query)) return 4;
  if (type === "HOURS" && /(hour|open|close|opening|when)/.test(query)) return 4;
  if (type === "MENU" && /(menu|eat|drink|latte|toast|dessert|sweet|plate|food|coffee)/.test(query)) return 3;
  if (type === "FAQ" && /(review|google|feedback|leave a review|how do i)/.test(query)) return 3;
  return 0;
}

export function matchChatbotReply(message, sources, fallback = FALLBACK_REPLY) {
  const query = normalize(message);
  if (!query || !Array.isArray(sources) || sources.length === 0) {
    return fallback;
  }

  let best = { score: 0, text: "" };

  for (const source of sources) {
    if (!source || source.isActive === false) continue;
    const text = collectText(source.content);
    if (!text) continue;

    let score = typeBoost(source.sourceType, query);
    for (const keyword of collectKeywords(source)) {
      if (keyword.length >= 3 && query.includes(keyword)) {
        score += keyword.length >= 6 ? 2 : 1;
      }
    }

    if (score > best.score) {
      best = { score, text };
    }
  }

  if (best.score >= 2 && best.text) {
    return best.text;
  }

  return fallback;
}

export { FALLBACK_REPLY };
