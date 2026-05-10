import { createHmac, randomBytes } from 'node:crypto';

// 知乎 OpenAPI HMAC signing helper.
//
// Per https://www.zhihu.com/ring/moltbook/api/community/quickstart (2026-05-10):
// every request to https://openapi.zhihu.com/* community endpoints must include
// 5 X-* headers. The signature is HMAC-SHA256 over a pipe-joined string of
// `app_key:{userToken}|ts:{ts}|logid:{logId}|extra_info:{extra}`, keyed by
// `app_secret`, then base64-encoded.
//
// Server-only — uses node:crypto. The adapter dynamic-imports this module
// from `realFetch` so client bundles never pull in node primitives.

export interface ZhihuSignedHeaders {
  'X-App-Key': string;
  'X-Timestamp': string;
  'X-Log-Id': string;
  'X-Sign': string;
  'X-Extra-Info': string;
}

export interface SignOpts {
  /** Override timestamp for tests / replay. Seconds since epoch. */
  timestamp?: number;
  /** Override log id for tests. Otherwise auto-generated. */
  logId?: string;
  /** Extra info — opaque pass-through. Empty string is allowed (and common). */
  extraInfo?: string;
}

/**
 * Build the 5 X-* headers required for any openapi.zhihu.com community API call.
 *
 * @param appKey  user token (the URL suffix from your 知乎主页, e.g.
 *                `tyang4-1530` for `https://www.zhihu.com/people/tyang4-1530`)
 * @param appSecret  the 32-char application secret issued by organizers
 *                   (e.g., `X2LAM67SulXpSaSmeo2Duq2AleaJYaXI`)
 * @param opts  optional overrides for deterministic test runs
 */
export function signZhihuRequest(
  appKey: string,
  appSecret: string,
  opts: SignOpts = {},
): ZhihuSignedHeaders {
  const ts = String(opts.timestamp ?? Math.floor(Date.now() / 1000));
  const logId = opts.logId ?? `kanshan-${randomBytes(8).toString('hex')}`;
  const extra = opts.extraInfo ?? '';
  // NOTE: trailing colon after extra_info: is intentional — even when extra
  // is empty, the format is `app_key:X|ts:Y|logid:Z|extra_info:` (with no
  // trailing value). Verified against the docs page Go reference.
  const signStr = `app_key:${appKey}|ts:${ts}|logid:${logId}|extra_info:${extra}`;
  const sig = createHmac('sha256', appSecret).update(signStr).digest('base64');
  return {
    'X-App-Key': appKey,
    'X-Timestamp': ts,
    'X-Log-Id': logId,
    'X-Sign': sig,
    'X-Extra-Info': extra,
  };
}

/** Build the canonical signing string. Exposed only for golden tests. */
export function buildZhihuSignString(
  appKey: string,
  ts: string,
  logId: string,
  extraInfo: string,
): string {
  return `app_key:${appKey}|ts:${ts}|logid:${logId}|extra_info:${extraInfo}`;
}
