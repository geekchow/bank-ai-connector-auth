import unittest
from datetime import datetime, timezone

from cimd_policy import CimdRejected, check_redirect_uri, validate_client_id_url, validate_metadata
from rar_consent import PAYMENT_DRAFT_TYPE, RarRejected, normalise_payment_draft
from token_policy import ClientProfile, lifetimes_for


class CimdTests(unittest.TestCase):
    def test_rejects_untrusted_host(self):
        with self.assertRaises(CimdRejected):
            validate_client_id_url("https://evil.example/client.json")

    def test_rejects_http_and_missing_path(self):
        for bad in ("http://claude.ai/x.json", "https://claude.ai", "https://claude.ai/"):
            with self.assertRaises(CimdRejected):
                validate_client_id_url(bad)

    def test_client_id_must_match_exactly(self):
        with self.assertRaises(CimdRejected):
            validate_metadata(
                "https://claude.ai/a.json",
                {"client_id": "https://claude.ai/b.json", "client_name": "x", "redirect_uris": ["https://claude.ai/cb"]},
            )

    def test_loopback_port_agnostic_match(self):
        meta = validate_metadata(
            "https://claude.ai/oauth/claude-code-client-metadata",
            {
                "client_id": "https://claude.ai/oauth/claude-code-client-metadata",
                "client_name": "Claude Code",
                "redirect_uris": ["http://localhost/callback", "http://127.0.0.1/callback"],
            },
        )
        check_redirect_uri(meta, "http://127.0.0.1:53121/callback")
        with self.assertRaises(CimdRejected):
            check_redirect_uri(meta, "http://127.0.0.1:53121/other")


class RarTests(unittest.TestCase):
    NOW = datetime(2026, 10, 23, tzinfo=timezone.utc)
    BASE = {
        "type": PAYMENT_DRAFT_TYPE,
        "actions": ["create_draft"],
        "debtor_account_ref": "acc_7Hq2",
        "creditor_constraint": {"mode": "registered_payees_only"},
        "instructed_amount_limit": {"currency": "HKD", "per_transaction": "50000", "cumulative": "90000"},
        "valid_until": "2027-06-01T00:00:00Z",
    }

    def grant(self, **over):
        return normalise_payment_draft(
            {**self.BASE, **over},
            resource="https://mcp.examplebank.hk/mcp",
            user_accounts={"acc_7Hq2": "港元儲蓄 ***381"},
            now=self.NOW,
        )

    def test_policy_caps_and_validity_are_applied(self):
        g = self.grant().detail
        self.assertEqual(g["instructed_amount_limit"]["per_transaction"], "10000.00")
        self.assertEqual(g["instructed_amount_limit"]["cumulative"], "30000.00")
        self.assertEqual(g["valid_until"], "2026-11-22T00:00:00Z")
        self.assertEqual(g["locations"], ["https://mcp.examplebank.hk/mcp"])

    def test_execute_action_is_refused(self):
        with self.assertRaises(RarRejected):
            self.grant(actions=["create_draft", "execute"])

    def test_foreign_account_is_refused(self):
        with self.assertRaises(RarRejected):
            self.grant(debtor_account_ref="acc_other")

    def test_consent_text_mentions_draft_only(self):
        self.assertIn("不能自行付款", self.grant().consent_text_zh_hk)


class TokenPolicyTests(unittest.TestCase):
    def test_public_bearer_client_gets_short_tokens_and_rotation(self):
        lt = lifetimes_for(ClientProfile("https://claude.ai/x", False, False), {"accounts:read"})
        self.assertEqual(lt.access_token_s, 300)
        self.assertTrue(lt.rotate_refresh_token)

    def test_high_risk_scope_shortens_reauth(self):
        lt = lifetimes_for(ClientProfile("c", True, True), {"payments:draft"})
        self.assertEqual(lt.access_token_s, 300)
        self.assertEqual(lt.reauth_after_s, 30 * 24 * 3600)


if __name__ == "__main__":
    unittest.main()
