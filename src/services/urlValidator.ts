/**
 * URL Validator & Security Guard
 * Validates, normalizes, and sanitizes target URLs for web intelligence research.
 * Prevents SSRF attacks on internal/local networks.
 */

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  domain?: string;
  protocol?: string;
  reason?: string;
}

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
];

export function validateAndNormalizeUrl(input: string, allowLocalNetwork = false): UrlValidationResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, reason: 'URL input is empty' };
  }

  let parsed: URL;
  try {
    const prefixed = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(prefixed);
  } catch {
    return { valid: false, reason: 'Malformed URL structure' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}. Only http:// and https:// are supported.` };
  }

  const hostname = parsed.hostname;

  if (!allowLocalNetwork) {
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return {
          valid: false,
          reason: `Access to local/private network address "${hostname}" is restricted for security.`,
        };
      }
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    domain: hostname.replace(/^www\./, ''),
    protocol: parsed.protocol,
  };
}

export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
  const matches = text.match(urlRegex) || [];
  const validUrls: string[] = [];

  for (const raw of matches) {
    const clean = raw.replace(/[.,;!)]+$/, '');
    const validated = validateAndNormalizeUrl(clean);
    if (validated.valid && validated.normalizedUrl) {
      if (!validUrls.includes(validated.normalizedUrl)) {
        validUrls.push(validated.normalizedUrl);
      }
    }
  }

  return validUrls;
}
