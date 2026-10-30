import { ValidationError } from './errors';

export interface FileUploadMetadata {
  name: string;
  size: number;
  type: string;
  content?: string; // Base64 or text content (for SVG)
}

export interface ValidatedFileResult {
  sanitizedName: string;
  mimeType: string;
  sizeBytes: number;
  sanitizedContent?: string;
}

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

// Disallowed tags in SVGs
const DISALLOWED_SVG_TAGS = [
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'applet',
  'meta',
  'link',
];

export const fileSecurity = {
  /**
   * Sanitizes a file name, removing path traversal patterns and dangerous characters.
   */
  sanitizeFilename: (name: string): string => {
    if (!name || typeof name !== 'string') {
      return `upload-${Date.now()}.png`;
    }

    // Strip path separators, null bytes, and traversal dots
    let cleaned = name
      .replace(/\0/g, '')
      .replace(/\.\.+/g, '')
      .replace(/[/\\]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .trim();

    if (!cleaned) {
      cleaned = `upload-${Date.now()}.png`;
    }

    return cleaned;
  },

  /**
   * Validates and sanitizes SVG markup to prevent XSS and XML External Entity (XXE) attacks.
   */
  sanitizeSvg: (svgText: string): string => {
    // 1. Check for XML External Entity (XXE) / DOCTYPE injection
    if (/<!ENTITY/i.test(svgText) || /SYSTEM\s+["']/i.test(svgText)) {
      throw new ValidationError('SVG file contains disallowed XML external entities (XXE).');
    }

    let sanitized = svgText;

    // 2. Remove dangerous tags
    for (const tag of DISALLOWED_SVG_TAGS) {
      const tagRegex = new RegExp(`<\\s*${tag}[^>]*>([\\s\\S]*?<\\s*\\/\\s*${tag}\\s*>)?`, 'gi');
      sanitized = sanitized.replace(tagRegex, '');
    }

    // 3. Remove dangerous attributes (e.g. onload, onclick, javascript: links)
    // Build a single attribute-removal regex for each disallowed pattern.
    // Note: we build the pattern from the source without anchors (^ would prevent in-tag matching).
    sanitized = sanitized.replace(
      /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      ''
    );
    sanitized = sanitized.replace(
      /\s+(?:href|src|xlink:href|action)\s*=\s*(?:"(?:javascript:|data:text\/html|vbscript:)[^"]*"|'(?:javascript:|data:text\/html|vbscript:)[^']*')/gi,
      ''
    );

    // 4. Also strip any remaining javascript: links in href or xlink:href
    sanitized = sanitized.replace(/(href|xlink:href)\s*=\s*["']\s*javascript:[^"']*["']/gi, '$1=""');

    return sanitized;
  },

  /**
   * Performs full security validation on a floor-plan upload.
   */
  validateFloorPlanFile: (file: FileUploadMetadata): ValidatedFileResult => {
    // 1. File size check
    if (file.size <= 0) {
      throw new ValidationError('Uploaded file is empty (0 bytes).');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum permitted limit of 10MB.`
      );
    }

    // 2. MIME type check
    const mime = file.type.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(mime)) {
      throw new ValidationError(
        `Disallowed file type '${mime}'. Allowed formats: PNG, JPEG, WebP, SVG.`
      );
    }

    // 3. Filename sanitation
    const sanitizedName = fileSecurity.sanitizeFilename(file.name);

    // 4. SVG Content Sanitization
    let sanitizedContent = file.content;
    if (mime === 'image/svg+xml' && file.content) {
      sanitizedContent = fileSecurity.sanitizeSvg(file.content);
    }

    return {
      sanitizedName,
      mimeType: mime,
      sizeBytes: file.size,
      sanitizedContent,
    };
  },
};

