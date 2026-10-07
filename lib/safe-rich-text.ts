import sanitizeHtml from "sanitize-html";

export function safeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img", "h1", "h2", "span"],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["style"],
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      td: ["colspan", "rowspan", "style"],
      th: ["colspan", "rowspan", "style"],
    },
    allowedSchemes: ["https", "http", "mailto", "tel"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    allowedStyles: { "*": {
      "text-align": [/^(left|right|center|justify)$/],
      "font-weight": [/^(normal|bold|[1-9]00)$/],
      "font-style": [/^(normal|italic)$/],
      "text-decoration": [/^(none|underline|line-through)$/],
      color: [/^#[0-9a-f]{3,8}$/i],
      "background-color": [/^#[0-9a-f]{3,8}$/i],
    } },
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
  });
}
