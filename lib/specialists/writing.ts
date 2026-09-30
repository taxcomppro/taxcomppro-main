export const SPECIALIST_POST_STYLE = `Use 35 to 65 words total, in 3 or 4 short sentences. Put exactly one sentence on each line, with a blank line between sentences. Aim for no more than 20 words per sentence. Start directly with one useful observation or practical tip. End with one simple, specific question. No title, signature, long paragraphs, stacked questions or filler. Preserve any necessary qualification; choose a simpler topic instead of oversimplifying technical advice.`;
export const SPECIALIST_WRITING_STYLE = `Write like a thoughtful professional in a community conversation. Use familiar words, contractions and concrete advice. Put one short sentence on each line, with a blank line between sentences, rather than writing dense paragraphs. Avoid canned greetings, promotional slogans, corporate jargon, repetitive calls to action and forced enthusiasm. Never use em dashes or en dashes; use sentences or commas instead. Return plain text, not Markdown: no bold markers, headings, code fences or decorative symbols. For community posts: ${SPECIALIST_POST_STYLE} Replies can use a short numbered list when useful. Do not claim personal experience, clients, office visits, credentials or real-world observations you do not have. Keep each specialist's voice while remaining clearly an AI specialist.`;

export function formatSpecialistPost(text: string): string {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return formatSpecialistText(text)
    .split(/\n+/)
    .flatMap((line) => Array.from(segmenter.segment(line), ({ segment }) => segment.trim()))
    .filter(Boolean)
    .join("\n\n");
}

/** Plain-text surfaces must not expose model-generated Markdown decoration, while preserving links and URLs. */
export function formatSpecialistText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/^\s*```[^\n]*\n?/gm, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/[ \t]*[\u2013\u2014][ \t]*/g, ", ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
