import profanity from "leo-profanity";

profanity.loadDictionary("en");
const englishWords = profanity.list();
profanity.loadDictionary("ru");
profanity.add(englishWords);

export function sanitizeDisplayName(value) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, "")
    .trim()
    .slice(0, 18);
}

export function isDisplayNameAllowed(value) {
  const name = sanitizeDisplayName(value).normalize("NFKC");
  return name.length >= 2 && !profanity.check(name);
}

export function sanitizeAge(value) {
  const raw = String(value ?? "").trim();
  const age = Number(raw);
  return Number.isInteger(age) && age >= 5 && age <= 120 ? String(age) : "";
}
