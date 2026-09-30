"use client";

import React from "react";

interface Token {
  type: "text" | "link";
  text: string;
  href?: string;
  isExternal?: boolean;
}

export function parseLinkifiedTokens(text: string): Token[] {
  if (!text) return [];

  const tokens: Token[] = [];
  // Match markdown links [Label](url) OR raw URLs (https://, http://, www.)
  const regex = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<]+)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        text: text.slice(lastIndex, match.index),
      });
    }

    if (match[1] && match[2]) {
      // Markdown link: [label](url)
      const label = match[1];
      let href = match[2].trim();
      if (href.startsWith("www.")) {
        href = `https://${href}`;
      }
      tokens.push({
        type: "link",
        text: label,
        href,
        isExternal: !href.startsWith("/"),
      });
      lastIndex = regex.lastIndex;
    } else if (match[3]) {
      // Raw URL: https://... or www....
      let rawUrl = match[3];
      // Trim trailing punctuation like . , ! ? : ; " ' ) ]
      const punctuationMatch = rawUrl.match(/[.,!?:;)"'\]]+$/);
      let trailingPunctuation = "";
      if (punctuationMatch) {
        trailingPunctuation = punctuationMatch[0];
        rawUrl = rawUrl.slice(0, rawUrl.length - trailingPunctuation.length);
      }

      let href = rawUrl;
      if (href.startsWith("www.")) {
        href = `https://${href}`;
      }

      tokens.push({
        type: "link",
        text: rawUrl,
        href,
        isExternal: !href.startsWith("/"),
      });

      if (trailingPunctuation) {
        tokens.push({
          type: "text",
          text: trailingPunctuation,
        });
      }

      lastIndex = regex.lastIndex;
    }
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      text: text.slice(lastIndex),
    });
  }

  return tokens;
}

interface LinkifiedTextProps {
  text: string;
  className?: string;
  linkClassName?: string;
}

export default function LinkifiedText({
  text,
  className,
  linkClassName = "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline underline-offset-2 font-medium break-all hover:opacity-90 transition-colors",
}: LinkifiedTextProps) {
  if (!text) return null;

  const tokens = parseLinkifiedTokens(text);

  return (
    <span className={className}>
      {tokens.map((token, index) => {
        if (token.type === "link" && token.href) {
          return (
            <a
              key={index}
              href={token.href}
              target={token.isExternal ? "_blank" : undefined}
              rel={token.isExternal ? "noopener noreferrer" : undefined}
              onClick={(e) => e.stopPropagation()}
              className={linkClassName}
              title={token.href}
            >
              {token.text}
            </a>
          );
        }
        return <React.Fragment key={index}>{token.text}</React.Fragment>;
      })}
    </span>
  );
}
