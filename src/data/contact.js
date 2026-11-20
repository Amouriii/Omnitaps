/**
 * Single source of truth for the people behind Omnitaps and the links that
 * reach them. The Home contact section and the Contact page both read from
 * here, so a changed address or number updates in one place and cannot drift
 * between the two pages.
 */

/* People you can reach directly */
export const TEAM = [
    {
        name: "Mohamed Sameh",
        role: "Point of contact",
        email: "mosameh15@outlook.com",
        phones: ["+201015645898"],
    },
    {
        name: "Omar Nouh",
        role: "Point of contact",
        email: "onouh7@gmail.com",
        phones: ["+201200063055", "+15035065006"],
    },
    {
        name: "Mohamed Atef",
        role: "Point of contact",
        email: "mohamedatef5115@gmail.com",
        phones: ["+201123360043"],
    },
];

/* Default person behind "contact us" CTAs, the Home channels and the form fallback. */
export const PRIMARY_CONTACT = TEAM[0];

export const CONTACT_HOURS = "Mon–Fri · 9:00–18:00";

export function mailtoHref(email) {
    return `mailto:${email}`;
}

/* E.164 for tel:, digits only for wa.me. */
export function telHref(phone) {
    return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(phone) {
    return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

/* Display phone numbers in international format; the href keeps plain E.164. */
export function formatPhone(value) {
    const digits = value.replace(/[^\d+]/g, "");
    if (/^\+20\d{10}$/.test(digits)) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 9)} ${digits.slice(9)}`;
    }
    if (/^\+1\d{10}$/.test(digits)) {
        return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
    return value;
}

/* Compose the payload the API would have mailed, as a mailto: hand-off. */
export function buildEnquiryMailto(
    { name, email, company, message },
    to = PRIMARY_CONTACT.email,
) {
    const subject = `Website enquiry from ${name || "a visitor"}`;
    const body = [
        `Name: ${name ?? ""}`,
        `Email: ${email ?? ""}`,
        company ? `Company: ${company}` : null,
        "",
        message ?? "",
    ]
        .filter((line) => line !== null)
        .join("\n");
    return `${mailtoHref(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
