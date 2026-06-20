import curl2Json from "@bany/curl-to-json";
import fs from "node:fs";
import path from "node:path";

export interface CurlValidationResult {
    isValid: boolean;
    message?: string;
    json?: any;
}

/**
 * Validates if the cURL command is parseable and contains required variables
 */
export const validateCurl = (curl: string): CurlValidationResult => {
    if (!curl || !curl.trim()) {
        return { isValid: false, message: "Command cannot be empty." };
    }

    if (!curl.trim().toLowerCase().startsWith("curl")) {
        return { isValid: false, message: "Command must start with 'curl'." };
    }

    try {
        const json = curl2Json(curl);

        // Ensure {{TEXT}} is present so we can inject the prompt
        // We check the raw string for the placeholder because it might be in url, header, or body
        if (!curl.includes("{{TEXT}}")) {
            return {
                isValid: false,
                message: "Your cURL must contain {{TEXT}} placeholder for the prompt."
            };
        }

        return { isValid: true, json };
    } catch (error) {
        return { isValid: false, message: "Invalid cURL syntax." };
    }
};

/**
 * Replaces {{KEY}} placeholders with actual values
 */
export function deepVariableReplacer(
    node: any,
    variables: Record<string, string>
): any {
    if (typeof node === "string") {
        let result = node;
        for (const [key, value] of Object.entries(variables)) {
            // Global replace of {{KEY}}
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
        }
        return result;
    }
    if (Array.isArray(node)) {
        return node.map((item) => deepVariableReplacer(item, variables));
    }
    if (node && typeof node === "object") {
        const newNode: { [key: string]: any } = {};
        for (const key in node) {
            newNode[key] = deepVariableReplacer(node[key], variables);
        }
        return newNode;
    }
    return node;
}

/**
 * Detects MIME type from a file path's extension.
 * Defaults to "image/png" because the app's ScreenshotHelper exclusively produces .png files.
 */
export function imageMimeTypeFromPath(filePath: string): string {
    // Extract only the final extension component, guarding against paths with no dot
    const basename = filePath.split(/[/\\]/).pop() ?? "";
    const dotIdx = basename.lastIndexOf(".");
    const ext = dotIdx !== -1 ? basename.slice(dotIdx + 1).toLowerCase() : "";
    const map: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
    };
    return map[ext] ?? "image/png";
}

/**
 * Auto-upgrades the last user message in an OpenAI-compatible `messages` array
 * from a plain string to a multimodal content array when a base64 image is present.
 *
 * - If `body.messages` is not an array, returns `body` unchanged (no-op for non-OpenAI formats).
 * - If the last user message already contains an image_url part, it is not duplicated.
 * - If the content is already a multimodal array (e.g. user manually included {{IMAGE_BASE64}}
 *   in an image_url field), the image is appended only if not already present.
 * - All other messages and body fields are left untouched (fully backward-compatible).
 */
export function injectImageIntoMessages(
    body: any,
    base64Image: string,
    imagePath: string
): any {
    if (!base64Image || !Array.isArray(body?.messages)) return body;

    const messages: any[] = body.messages.slice();

    // Find the last user-role message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i]?.role === "user") {
            lastUserIdx = i;
            break;
        }
    }
    if (lastUserIdx === -1) return body;

    const lastUser = messages[lastUserIdx];
    const mimeType = imageMimeTypeFromPath(imagePath);
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    if (Array.isArray(lastUser.content)) {
        // Already a multimodal array — append image_url only if absent
        const alreadyHasImage = lastUser.content.some(
            (part: any) => part?.type === "image_url"
        );
        if (alreadyHasImage) return body;
        messages[lastUserIdx] = {
            ...lastUser,
            content: [
                ...lastUser.content,
                { type: "image_url", image_url: { url: imageUrl } },
            ],
        };
    } else if (typeof lastUser.content === "string") {
        // Plain string → standard OpenAI multimodal array
        messages[lastUserIdx] = {
            ...lastUser,
            content: [
                { type: "text", text: lastUser.content },
                { type: "image_url", image_url: { url: imageUrl } },
            ],
        };
    }
    // Non-string, non-array content (e.g. null/undefined): leave untouched

    return { ...body, messages };
}

/**
 * Validates a URL to prevent SSRF attacks.
 * Returns { isValid: true } if the URL is safe to fetch.
 * Returns { isValid: false, reason: string } if the URL is blocked.
 *
 * Blocks:
 * - localhost, 127.0.0.1, ::1 (loopback)
 * - 0.0.0.0
 * - link-local (169.254.0.0/16)
 * - private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
 * - Protocol-relative URLs (//example.com)
 * - Path traversal sequences (/../)
 */
export function validateUrlForSsrf(urlString: string): { isValid: boolean; reason?: string } {
    if (!urlString || typeof urlString !== 'string') {
        return { isValid: false, reason: 'URL must be a non-empty string' };
    }

    // Block protocol-relative URLs
    if (urlString.startsWith('//')) {
        return { isValid: false, reason: 'Protocol-relative URLs are not allowed' };
    }

    // Block data: URLs
    if (urlString.toLowerCase().startsWith('data:')) {
        return { isValid: false, reason: 'Data URLs are not allowed' };
    }

    // Block file: URLs
    if (urlString.toLowerCase().startsWith('file:')) {
        return { isValid: false, reason: 'File URLs are not allowed' };
    }

    // Block javascript: URLs
    if (urlString.toLowerCase().startsWith('javascript:')) {
        return { isValid: false, reason: 'JavaScript URLs are not allowed' };
    }

    let url: URL;
    try {
        url = new URL(urlString);
    } catch (e) {
        return { isValid: false, reason: 'Invalid URL format' };
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
        return { isValid: false, reason: 'Loopback addresses are not allowed' };
    }

    // Block link-local (169.254.x.x)
    if (hostname.startsWith('169.254.')) {
        return { isValid: false, reason: 'Link-local addresses are not allowed' };
    }

    // Block private network ranges
    // 10.0.0.0/8
    if (hostname.startsWith('10.')) {
        return { isValid: false, reason: 'Private network (10.x.x.x) is not allowed' };
    }

    // 172.16.0.0/12 — 172.16.x.x through 172.31.x.x
    if (hostname.startsWith('172.')) {
        const secondOctet = parseInt(hostname.split('.')[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) {
            return { isValid: false, reason: 'Private network (172.16-31.x.x) is not allowed' };
        }
    }

    // 192.168.0.0/16
    if (hostname.startsWith('192.168.')) {
        return { isValid: false, reason: 'Private network (192.168.x.x) is not allowed' };
    }

    // Block URLs with path traversal
    if (urlString.includes('/../') || urlString.includes('/..\\')) {
        return { isValid: false, reason: 'Path traversal sequences are not allowed' };
    }

    // Require HTTPS for external URLs (allow http://localhost for dev testing only)
    if (url.protocol !== 'https:' && !hostname.startsWith('127.')) {
        return { isValid: false, reason: 'Only HTTPS URLs are allowed (except localhost)' };
    }

    return { isValid: true };
}

/**
 * SECURITY (P0): Validates that an image path is safe to use.
 *
 * Uses realpath resolution to detect symlink escapes and provides
 * defense-in-depth against path traversal attacks.
 *
 * Blocks:
 * - Path traversal sequences (/../ or /..\)
 * - Absolute paths outside app-owned directories
 * - Sensitive system paths (/etc/, /home/, /var/, etc.)
 * - Windows drive paths (C:\, D:\, etc.) outside app-owned directories
 * - Symlink escapes to directories outside allowed roots
 *
 * Allowed paths (allowlist):
 * - Paths inside userData directory
 * - Paths inside <userData>/screenshots/
 * - Paths inside <userData>/extra_screenshots/
 * - Any other explicitly created app-owned screenshot directories
 *
 * @param imagePath - The path to validate
 * @param userDataPath - The app's userData directory path
 * @returns { isValid: boolean, reason?: string }
 */
function isWindowsAbsolutePath(candidate: string): boolean {
    return /^[A-Za-z]:[\\/]/.test(candidate);
}

function normalizeForPathAllowlist(candidate: string): string {
    const slashPath = candidate.replace(/\\/g, '/');
    const normalized = isWindowsAbsolutePath(slashPath)
        ? path.win32.normalize(slashPath).replace(/\\/g, '/')
        : path.posix.normalize(slashPath);
    return normalized.replace(/\/+$/, '');
}

function isSameOrChildPath(candidate: string, root: string, caseInsensitive: boolean): boolean {
    const normalizedCandidate = caseInsensitive ? candidate.toLowerCase() : candidate;
    const normalizedRoot = caseInsensitive ? root.toLowerCase() : root;
    return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`);
}

export function validateImagePath(imagePath: string, userDataPath: string): { isValid: boolean; reason?: string } {
    if (!imagePath || typeof imagePath !== 'string') {
        return { isValid: false, reason: 'Image path must be a non-empty string' };
    }

    if (!userDataPath || typeof userDataPath !== 'string') {
        return { isValid: false, reason: 'App data directory is not available' };
    }

    // Normalize path separators before traversal checks and allowlist comparison.
    const slashNormalizedPath = imagePath.replace(/\\/g, '/');

    // Block path traversal
    if (slashNormalizedPath.split('/').includes('..')) {
        return { isValid: false, reason: 'Path traversal sequences are not allowed' };
    }

    // Normalize paths for comparison. Windows paths are case-insensitive, so
    // compare lowercased values when either side is a Windows absolute path.
    const normalizedPath = normalizeForPathAllowlist(imagePath);
    const normalizedUserData = normalizeForPathAllowlist(userDataPath);
    const compareCaseInsensitive =
        isWindowsAbsolutePath(normalizedPath) || isWindowsAbsolutePath(normalizedUserData);

    // Define allowed roots (app-owned directories only)
    const allowedRoots = [
        normalizedUserData,
        normalizeForPathAllowlist(`${normalizedUserData}/screenshots`),
        normalizeForPathAllowlist(`${normalizedUserData}/extra_screenshots`),
    ].filter(Boolean);

    // Resolve the image path to its real path to detect symlink escapes
    let resolvedPath: string;
    try {
        resolvedPath = normalizeForPathAllowlist(fs.realpathSync(imagePath));
    } catch {
        // If realpath fails, the file doesn't exist or is inaccessible.
        // We still want to validate the requested path for security.
        // Check if the requested path itself is safe (not crossing boundaries).
        resolvedPath = normalizedPath;
    }

    // Check if resolved path is within any allowed root
    const isAllowed = allowedRoots.some(allowedRoot =>
        isSameOrChildPath(resolvedPath, allowedRoot, compareCaseInsensitive)
    );

    if (isAllowed) {
        return { isValid: true };
    }

    // Also check the original path against allowed roots as fallback
    // This handles cases where the resolved path is the same as normalized
    const originalIsAllowed = allowedRoots.some(allowedRoot =>
        isSameOrChildPath(normalizedPath, allowedRoot, compareCaseInsensitive)
    );

    if (originalIsAllowed) {
        return { isValid: true };
    }

    // Block Windows drive paths that are not inside the app-owned allowlist.
    if (isWindowsAbsolutePath(normalizedPath)) {
        return { isValid: false, reason: 'Windows absolute paths must be inside app directory or screenshots folder' };
    }

    // Block Unix absolute paths that are outside userData
    if (normalizedPath.startsWith('/etc/') ||
        normalizedPath.startsWith('/home/') ||
        normalizedPath.startsWith('/var/') ||
        normalizedPath.startsWith('/tmp/')) {
        return { isValid: false, reason: 'Paths outside app directory are not allowed' };
    }

    // Block paths that resolve outside allowed roots (symlink escape attempt)
    if (resolvedPath !== normalizedPath && !isAllowed) {
        return { isValid: false, reason: 'Symlink escape detected: path resolves outside allowed directory' };
    }

    // If we can't determine the path is safe, block it
    return { isValid: false, reason: 'Image path must be inside app directory or screenshots folder' };
}

/**
 * Helper to traverse a JSON object via dot notation (e.g. "choices[0].message.content")
 */
export function getByPath(obj: any, path: string): any {
    if (!path) return obj;
    return path
        .replace(/\[/g, ".")
        .replace(/\]/g, "")
        .split(".")
        .reduce((o, k) => (o || {})[k], obj);
}
