"""Tests unitarios para workers/discord_notifier.py."""

import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Agregar workers al sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "workers")))

import discord_notifier


class TestDiscordNotifier(unittest.TestCase):
    """Suite de pruebas para el notificador de Discord."""

    def test_format_clp(self):
        """Verifica el formateo correcto a pesos chilenos."""
        self.assertEqual(discord_notifier.format_clp(15000), "$15.000")
        self.assertEqual(discord_notifier.format_clp(990), "$990")
        self.assertEqual(discord_notifier.format_clp(1234567), "$1.234.567")

    @patch("discord_notifier.requests.post")
    def test_send_discord_dm_success(self, mock_post):
        """Verifica envío exitoso de DM."""
        resp_channel = MagicMock()
        resp_channel.status_code = 200
        resp_channel.json.return_value = {"id": "dm_123"}

        resp_msg = MagicMock()
        resp_msg.status_code = 200

        mock_post.side_effect = [resp_channel, resp_msg]

        success = discord_notifier.send_discord_dm("fake_token", "123456", [{"title": "test"}])
        self.assertTrue(success)
        self.assertEqual(mock_post.call_count, 2)

    @patch("discord_notifier.requests.post")
    def test_send_discord_dm_unauthorized_401(self, mock_post):
        """Verifica que el error 401 sea detectado y retorne False."""
        resp_channel = MagicMock()
        resp_channel.status_code = 401
        resp_channel.text = '{"message": "401: Unauthorized", "code": 0}'
        mock_post.return_value = resp_channel

        success = discord_notifier.send_discord_dm("invalid_token", "123456", [{"title": "test"}])
        self.assertFalse(success)

    @patch("discord_notifier.requests.post")
    def test_send_discord_dm_rate_limited_429(self, mock_post):
        """Verifica reintento automático ante HTTP 429."""
        resp_429 = MagicMock()
        resp_429.status_code = 429
        resp_429.json.return_value = {"retry_after": 0.01}

        resp_ok_chan = MagicMock()
        resp_ok_chan.status_code = 200
        resp_ok_chan.json.return_value = {"id": "dm_123"}

        resp_ok_msg = MagicMock()
        resp_ok_msg.status_code = 200

        mock_post.side_effect = [resp_429, resp_ok_chan, resp_ok_msg]

        success = discord_notifier.send_discord_dm("fake_token", "123456", [{"title": "test"}])
        self.assertTrue(success)
        self.assertEqual(mock_post.call_count, 3)

    @patch("discord_notifier.send_discord_webhook")
    @patch("discord_notifier.send_discord_dm")
    def test_send_discord_alert_fallback_to_webhook(self, mock_dm, mock_webhook):
        """Verifica que si DM falla y hay webhook configurado, se haga fallback a webhook."""
        mock_dm.return_value = False
        mock_webhook.return_value = True

        items = [{"name": "Pisco Test", "store": "Lider", "price": 5000, "reason": "Test"}]
        result = discord_notifier.send_discord_alert(
            flagged_items=items,
            webhook_url="https://discord.com/api/webhooks/123/xyz",
            bot_token="invalid_token",
            user_id="123456"
        )
        self.assertTrue(result)
        mock_dm.assert_called()
        mock_webhook.assert_called()

    @patch("discord_notifier.time.sleep")
    @patch("discord_notifier._send_embeds_destination")
    def test_max_chunks_limit(self, mock_send, mock_sleep):
        """Verifica que no se envíen más chunks que MAX_ALERT_CHUNKS."""
        mock_send.return_value = True
        # Crear 80 items (8 chunks de 10)
        items = [
            {"name": f"Item {i}", "store": "Lider", "price": 1000, "reason": "Test"}
            for i in range(80)
        ]

        result = discord_notifier.send_discord_alert(
            flagged_items=items,
            webhook_url="https://discord.com/api/webhooks/123/xyz"
        )
        self.assertTrue(result)
        # Debe limitar a MAX_ALERT_CHUNKS = 5
        self.assertEqual(mock_send.call_count, discord_notifier.MAX_ALERT_CHUNKS)


if __name__ == "__main__":
    unittest.main()
