import sanitizeHtml from "sanitize-html";

/**
 * Strips all HTML tags from a string.
 * Used on user-supplied text fields before storing to DB.
 * Prevents stored XSS if any field is ever rendered as HTML.
 */
export function sanitizeText(value: string): string {
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
}

/**
 * Zod transform: strips HTML from any string field.
 * Usage: z.string().transform(sanitizeString)
 */
export function sanitizeString(value: string): string {
  return sanitizeText(value.trim());
}
