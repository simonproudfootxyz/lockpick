type ShareCopyInput = {
  text: string;
  url: string;
};

type ShareIntentInput = {
  title: string;
  text: string;
  url: string;
};

type ShareTextInput = {
  gameWon: boolean;
  finalScore: number;
  totalTurns: number;
  totalCardsPlayed: number;
  rank?: number;
};

const LOCALHOST_URL = "http://localhost:3000";

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeBaseUrl = (value?: string) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return removeTrailingSlash(parsed.toString());
  } catch {
    return null;
  }
};

export const getCanonicalShareUrl = ({
  siteUrl,
  fallbackOrigin,
  path = "/",
}: {
  siteUrl?: string;
  fallbackOrigin?: string;
  path?: string;
}) => {
  const baseUrl =
    normalizeBaseUrl(siteUrl) ??
    normalizeBaseUrl(fallbackOrigin) ??
    LOCALHOST_URL;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

export const buildShareTitle = () => "Lockpick Challenge";

export const buildShareText = ({
  gameWon,
  finalScore,
  totalTurns,
  totalCardsPlayed,
  rank,
}: ShareTextInput) => {
  const outcome = gameWon ? "won" : "finished";
  const rankSuffix = rank ? ` (Top #${rank})` : "";
  return `I ${outcome} Lockpick with a final score of ${finalScore}${rankSuffix}. ${totalCardsPlayed} cards played in ${totalTurns} turns. Can you beat me?`;
};

export const buildShareIntentUrls = ({ title, text, url }: ShareIntentInput) => {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  const encodedTextWithUrl = encodeURIComponent(`${text} ${url}`);
  const encodedTitle = encodeURIComponent(title);

  return {
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    bluesky: `https://bsky.app/intent/compose?text=${encodedTextWithUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
  };
};

export const buildCopyPayloads = ({ text, url }: ShareCopyInput) => ({
  link: url,
  text: `${text} ${url}`,
});
