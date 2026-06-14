import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const policyPath = path.resolve(
  __dirname,
  '../../../dist-electron/premium/electron/services/licenseVerifyPolicy.js'
);
const premiumPolicyAvailable = fs.existsSync(policyPath);

function premiumTest(name, fn) {
  test(name, { skip: !premiumPolicyAvailable }, fn);
}

async function loadPolicy() {
  return import(pathToFileURL(policyPath).href);
}

// Regression for F4 (Phase 2): a transient server state (429 ip_blocked, 403 account_suspended,
// 5xx, network error, unparseable body) must NEVER revoke a paying user's natively_api Pro
// license. Only a CONFIRMED loss of entitlement (plan downgraded / subscription_inactive /
// key_not_found) revokes.

premiumTest('active Pro (200 ok/has_pro) → active', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(200, { ok: true, has_pro: true, plan: 'pro' }), 'active');
  assert.equal(classifyProVerify(200, { ok: true, has_pro: true, plan: 'max' }), 'active');
});

premiumTest('plan downgraded to standard (200 has_pro:false) → revoke', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(200, { ok: true, has_pro: false, plan: 'standard' }), 'revoke');
});

premiumTest('subscription_inactive (403) → revoke', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(403, { ok: false, error: 'subscription_inactive' }), 'revoke');
});

premiumTest('key_not_found / invalid_key_format → revoke (refund/deleted key)', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(403, { ok: false, error: 'key_not_found' }), 'revoke');
  assert.equal(classifyProVerify(400, { ok: false, error: 'invalid_key_format' }), 'revoke');
});

premiumTest('REGRESSION F4: account_suspended (403 payment hold) → keep (NOT revoke)', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(403, { ok: false, error: 'account_suspended' }), 'keep');
});

premiumTest('REGRESSION F4: ip_blocked (429 rate limit) → keep (NOT revoke)', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(429, { ok: false, error: 'ip_blocked' }), 'keep');
});

premiumTest('REGRESSION F4: 5xx server error → keep (fail-open)', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(503, { error: 'server_error' }), 'keep');
  assert.equal(classifyProVerify(500, null), 'keep');
});

premiumTest('REGRESSION F4: network error (status 0) → keep (fail-open)', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(0, null), 'keep');
});

premiumTest('unparseable body on 200 → keep (fail-open, avoids false revoke)', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(200, null), 'keep');
});

premiumTest('unrecognized error code → keep (paying-user-safe default)', async () => {
  const { classifyProVerify } = await loadPolicy();
  assert.equal(classifyProVerify(418, { ok: false, error: 'some_future_error' }), 'keep');
});

premiumTest('transient error takes precedence even if has_pro:false also present', async () => {
  const { classifyProVerify } = await loadPolicy();
  // Defensive: a malformed transient response that also carries has_pro:false must still keep.
  assert.equal(classifyProVerify(429, { ok: false, has_pro: false, error: 'ip_blocked' }), 'keep');
});
