const HIDDEN_REASONING_PATTERNS = [
  /\[\[.*?\]\]/gs,
  /\{\{.*?\}\}/gs,
  /<reasoning>[\s\S]*?<\/reasoning>/gi,
  /<thoughts>[\s\S]*?<\/thoughts>/gi,
  /<!--([\s\S]*?)-->/g,
];

const CHAIN_OF_THOUGHT_PATTERNS = [
  /\bchain of thought\b[\s\S]*$/gim,
  /\bcoT\b[\s\S]*$/gim,
  /\bthoughts?:\b[\s\S]*$/gim,
  /\breasoning:\b[\s\S]*$/gim,
  /\bI think\b/gi,
  /\bI believe\b/gi,
  /\bIt appears\b/gi,
];

const INTERNAL_PAYLOAD_KEYS = [
  'task_id',
  'team_id',
  'project_id',
  'tenant_id',
  'session_id',
  'metadata',
  'internal',
  'trace',
  'trace_id',
  'debug',
  'logs',
];

export function sanitizeModelPrompt(text: string): string {
  let safe = String(text);
  safe = stripHiddenReasoning(safe);
  safe = stripChainOfThought(safe);
  safe = removeUnsupportedContentTypes(safe);
  safe = stripInternalMetadataFromString(safe);
  return safe.trim();
}

export function sanitizeModelResponse(text: string): string {
  let safe = String(text);
  safe = stripHiddenReasoning(safe);
  safe = stripChainOfThought(safe);
  safe = removeUnsupportedContentTypes(safe);
  safe = removeUnsupportedMessageTypes(safe);
  safe = stripInternalMetadataFromString(safe);
  return safe.trim();
}

export function sanitizeTaskPayload(payload: Record<string, unknown>): Record<string, unknown> {
  function cleanValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(cleanValue);
    }
    if (value && typeof value === 'object') {
      return stripInternalMetadata(value as Record<string, unknown>);
    }
    if (typeof value === 'string') {
      return sanitizeModelPrompt(value);
    }
    return value;
  }

  return stripInternalMetadata(payload, cleanValue);
}

export function truncateToContextWindow(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(-maxChars);
}

export function convertToolOutputToMarkdown(data: unknown): string {
  if (data == null) return '';
  if (typeof data === 'string') return removeUnsupportedContentTypes(data).trim();
  if (typeof data === 'number' || typeof data === 'boolean') return String(data);
  if (Array.isArray(data)) {
    return data.map((item) => `- ${convertToolOutputToMarkdown(item)}`).join('\n');
  }
  if (typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) => `- **${key}**: ${convertToolOutputToMarkdown(value)}`)
      .join('\n');
  }
  return String(data);
}

function stripHiddenReasoning(text: string): string {
  return HIDDEN_REASONING_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), text);
}

function stripChainOfThought(text: string): string {
  return CHAIN_OF_THOUGHT_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), text);
}

function removeUnsupportedContentTypes(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\^\d+\]/g, '')
    .replace(/\bhttps?:\/\/\S+/g, '')
    .replace(/\s{2,}/g, ' ');
}

function removeUnsupportedMessageTypes(text: string): string {
  return text.replace(/\bimage\b|\baudio\b|\bvideo\b|\bfile\b|\battachment\b/gi, '');
}

function stripInternalMetadataFromString(text: string): string {
  let safe = String(text);
  INTERNAL_PAYLOAD_KEYS.forEach((key) => {
    const re = new RegExp(`"${key}"\s*:\s*(?:\{[\s\S]*?\}|\[[\s\S]*?\]|"[^"]*"|[^,}\]]*)`, 'gi');
    safe = safe.replace(re, '');
  });
  return safe.replace(/[,\s]+([,}])/g, '$1');
}

function stripInternalMetadata(
  payload: Record<string, unknown>,
  cleanValue: (value: unknown) => unknown = (value) => value
): Record<string, unknown> {
  return Object.entries(payload).reduce((result, [key, value]) => {
    if (INTERNAL_PAYLOAD_KEYS.includes(key)) return result;
    result[key] = cleanValue(value);
    return result;
  }, {} as Record<string, unknown>);
}
