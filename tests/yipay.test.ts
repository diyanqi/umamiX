import { test } from "node:test";
import assert from "node:assert/strict";
import { signYipayParams } from "@/lib/billing/provider";

const baseParams: Record<string, string> = {
  pid: "1001",
  type: "wxpay",
  out_trade_no: "ivfTEST123",
  notify_url: "https://analytics.infvar.com/api/billing/webhook",
  return_url: "https://analytics.infvar.com/dashboard/settings?billing=success",
  name: "Infvar Analytics Business",
  money: "99.00",
  sitename: "Infvar Analytics",
};

test("sorted yipay signature is deterministic and stable", () => {
  const first = signYipayParams(baseParams, "test-key", "sorted");
  const second = signYipayParams(baseParams, "test-key", "sorted");
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{32}$/);
});

test("fixed yipay signature differs from sorted signature", () => {
  const sorted = signYipayParams(baseParams, "test-key", "sorted");
  const fixed = signYipayParams(baseParams, "test-key", "fixed");
  assert.notEqual(sorted, fixed);
});

test("signature changes when the merchant key changes", () => {
  const before = signYipayParams(baseParams, "key-a", "sorted");
  const after = signYipayParams(baseParams, "key-b", "sorted");
  assert.notEqual(before, after);
});
