"""Notificador y auditor de alertas hacia Discord para Cuánto Rinde.

Soporta envío mediante Mensaje Directo (DM) vía Bot Tooodles o Webhook de canal,
con reintentos automáticos ante rate-limiting (HTTP 429), limitación de ráfagas
y fallback automático a Webhook en caso de fallo del bot.
"""

import datetime
import json
import os
import sys
import time
from typing import Any, Dict, List, Optional
import requests

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

MAX_ALERT_CHUNKS = 5
CHUNK_SIZE = 10
INTER_CHUNK_SLEEP_SECONDS = 1.0


def format_clp(amount: Any) -> str:
    """Formatea una cantidad numérica en formato de moneda chilena (CLP)."""
    try:
        return f"${int(amount):,}".replace(",", ".")
    except Exception:
        return f"${amount}"


def _get_utc_now_iso() -> str:
    """Retorna la fecha y hora UTC actual en formato ISO 8601 con sufijo Z."""
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def send_discord_dm(bot_token: str, user_id: str, embeds: List[Dict[str, Any]]) -> bool:
    """Envía un Mensaje Directo (DM) privado a un usuario de Discord usando el Bot Tooodles.

    Utiliza la Discord REST API v10 directamente e implementa reintento automático
    si recibe una respuesta de limitación de tasa (HTTP 429).

    Args:
        bot_token: Token del bot de Discord.
        user_id: ID numérico del usuario destinatario.
        embeds: Lista de diccionarios de embeds a enviar.

    Returns:
        bool: True si el mensaje se envió con éxito, False en caso contrario.
    """
    headers = {
        "Authorization": f"Bot {bot_token.strip()}",
        "Content-Type": "application/json",
    }

    # 1. Abrir o recuperar el canal de DM con el usuario
    dm_url = "https://discord.com/api/v10/users/@me/channels"
    try:
        res = requests.post(dm_url, headers=headers, json={"recipient_id": str(user_id).strip()}, timeout=10)
        if res.status_code == 429:
            retry_after = res.json().get("retry_after", 1.0)
            print(f"[Discord DM] ⏳ Rate limited al abrir canal DM. Esperando {retry_after}s...")
            time.sleep(retry_after + 0.1)
            res = requests.post(dm_url, headers=headers, json={"recipient_id": str(user_id).strip()}, timeout=10)

        if res.status_code not in [200, 201]:
            print(f"[Discord DM] ❌ Error abriendo canal DM con {user_id}: Status {res.status_code} - {res.text}")
            return False

        dm_channel = res.json()
        dm_channel_id = dm_channel.get("id")
    except Exception as e:
        print(f"[Discord DM] ❌ Excepción al conectar con Discord API: {e}")
        return False

    if not dm_channel_id:
        print(f"[Discord DM] ❌ No se obtuvo ID de canal DM.")
        return False

    # 2. Enviar el mensaje con embeds al canal DM
    msg_url = f"https://discord.com/api/v10/channels/{dm_channel_id}/messages"
    try:
        msg_res = requests.post(msg_url, headers=headers, json={"embeds": embeds}, timeout=10)
        if msg_res.status_code == 429:
            retry_after = msg_res.json().get("retry_after", 1.0)
            print(f"[Discord DM] ⏳ Rate limited al enviar mensaje. Esperando {retry_after}s...")
            time.sleep(retry_after + 0.1)
            msg_res = requests.post(msg_url, headers=headers, json={"embeds": embeds}, timeout=10)

        if msg_res.status_code in [200, 201]:
            print(f"[Discord DM] ✅ DM privado enviado exitosamente vía Tooodles a {user_id}.")
            return True
        else:
            print(f"[Discord DM] ❌ Error enviando mensaje a canal {dm_channel_id}: Status {msg_res.status_code} - {msg_res.text}")
            return False
    except Exception as e:
        print(f"[Discord DM] ❌ Excepción enviando DM: {e}")
        return False


def send_discord_webhook(webhook_url: str, embeds: List[Dict[str, Any]]) -> bool:
    """Envía embeds a un canal de texto a través de un Webhook de Discord.

    Args:
        webhook_url: URL completa del webhook de Discord.
        embeds: Lista de embeds formateados.

    Returns:
        bool: True si el webhook fue entregado con éxito, False en caso contrario.
    """
    payload = {
        "username": "Tooodles • Cuánto Rinde",
        "avatar_url": "https://raw.githubusercontent.com/Pipin333/calculadoracopete/main/favicon.ico",
        "embeds": embeds,
    }
    try:
        res = requests.post(webhook_url.strip(), json=payload, timeout=10)
        if res.status_code == 429:
            retry_after = res.json().get("retry_after", 1.0)
            print(f"[Discord Webhook] ⏳ Rate limited en Webhook. Esperando {retry_after}s...")
            time.sleep(retry_after + 0.1)
            res = requests.post(webhook_url.strip(), json=payload, timeout=10)

        if res.status_code in [200, 204]:
            print("[Discord Webhook] ✅ Alerta enviada exitosamente al canal.")
            return True
        else:
            print(f"[Discord Webhook] ❌ Error status {res.status_code}: {res.text}")
            return False
    except Exception as e:
        print(f"[Discord Webhook] ❌ Excepción en Webhook: {e}")
        return False


def _send_embeds_destination(
    embeds: List[Dict[str, Any]],
    token: Optional[str],
    target_user: Optional[str],
    url: Optional[str],
) -> bool:
    """Despacha un conjunto de embeds intentando DM y aplicando fallback a Webhook si aplica."""
    sent_by_dm = False
    if token and target_user:
        sent_by_dm = send_discord_dm(token, target_user, embeds)
        if sent_by_dm:
            return True
        if url:
            print("[Discord Notifier] ⚠️ Envío por DM falló. Intentando fallback a Webhook...")

    if url:
        return send_discord_webhook(url, embeds)

    return False


def send_discord_alert(
    flagged_items: List[Dict[str, Any]],
    webhook_url: Optional[str] = None,
    bot_token: Optional[str] = None,
    user_id: Optional[str] = None,
    title: Optional[str] = None,
    is_test: bool = False,
) -> bool:
    """Envía una alerta formateada a Discord.

    Prioridad y Resiliencia:
    1. Si hay DISCORD_BOT_TOKEN y DISCORD_USER_ID, intenta enviar DM privado vía Tooodles.
    2. Si el DM falla (ej. token caducado HTTP 401) o no está configurado, hace fallback automático a DISCORD_WEBHOOK_URL.
    3. Limita los lotes a un máximo para evitar saturación y spam en el canal, pausando entre lotes contra HTTP 429.

    Args:
        flagged_items: Lista de productos sospechosos detectados por el matcher/auditor.
        webhook_url: URL opcional de Webhook (o vía env DISCORD_WEBHOOK_URL).
        bot_token: Token opcional del bot (o vía env DISCORD_BOT_TOKEN).
        user_id: ID opcional del usuario destino (o vía env DISCORD_USER_ID).
        title: Título personalizado opcional del embed.
        is_test: Si es True, despacha un mensaje de bienvenida/verificación de conectividad.

    Returns:
        bool: True si todas las entregas tuvieron éxito o no había items que reportar.
    """
    token = bot_token or os.environ.get("DISCORD_BOT_TOKEN") or os.environ.get("token_priv")
    target_user = user_id or os.environ.get("DISCORD_USER_ID")
    url = webhook_url or os.environ.get("DISCORD_WEBHOOK_URL")

    has_dm = bool(token and target_user)
    has_webhook = bool(url)

    if not has_dm and not has_webhook:
        print("[Discord Notifier] ℹ️ Ni DISCORD_BOT_TOKEN/DISCORD_USER_ID ni DISCORD_WEBHOOK_URL están configurados. Omitiendo alerta.")
        return False

    if not flagged_items and not is_test:
        print("[Discord Notifier] ℹ️ No hay items sospechosos para reportar.")
        return True

    now_iso = _get_utc_now_iso()

    if is_test:
        test_embed = {
            "title": "🎶 Tooodles: Test de Alertas Cuánto Rinde",
            "description": (
                "¡Hola! Tu bot **Tooodles** está conectado correctamente.\n"
                "A partir de ahora, cada vez que el scraper diario detecte un falso positivo o item sospechoso, te avisará directamente."
            ),
            "color": 0x10B981,  # Verde esmeralda
            "timestamp": now_iso,
            "footer": {"text": "Tooodles Guardian • Cuánto Rinde"},
            "fields": [
                {"name": "Modo Principal", "value": "📬 Mensaje Directo (DM Privado)" if has_dm else "📢 Webhook de Canal", "inline": True},
                {"name": "Consola de Fundador", "value": "[Abrir Panel Admin](https://calculadoracopete.firebaseapp.com/admin.html)", "inline": True},
            ],
        }
        return _send_embeds_destination([test_embed], token, target_user, url)

    # Batching en grupos de CHUNK_SIZE productos para no exceder límites de Discord
    all_chunks = [flagged_items[i:i + CHUNK_SIZE] for i in range(0, len(flagged_items), CHUNK_SIZE)]
    total_items = len(flagged_items)
    total_chunks = len(all_chunks)

    # Limitar la cantidad máxima de chunks enviados en un solo ciclo
    chunks_to_send = all_chunks[:MAX_ALERT_CHUNKS]
    omitted_items = total_items - sum(len(c) for c in chunks_to_send)

    all_success = True

    for idx, chunk in enumerate(chunks_to_send):
        embed_title = title or f"🚨 Alerta de Catálogo: {total_items} Items a Revisar"
        if total_chunks > 1:
            embed_title += f" (Parte {idx + 1}/{len(chunks_to_send)})"

        fields = []
        for item in chunk:
            name = item.get("name", "Producto Desconocido")
            store = item.get("store", "Tienda")
            cat = item.get("category", "General")
            price = format_clp(item.get("price", 0))
            reason = item.get("reason", "Item sospechoso detectado")
            flag = item.get("flag_type", "AUDIT")
            action = item.get("action", "REQUIERE_REVISION")

            action_badge = "🛡️ Filtrado automáticamente" if "RECHAZADO" in action else "⚠️ Requiere revisión manual"

            fields.append({
                "name": f"[{store}] {name[:60]}",
                "value": (
                    f"**Categoría:** `{cat}` | **Precio:** `{price}` | **Tipo:** `{flag}`\n"
                    f"**Motivo:** {reason}\n"
                    f"**Acción:** {action_badge}"
                ),
                "inline": False,
            })

        # Si es el último chunk y quedaron items sin mostrar, agregar campo resumen
        if idx == len(chunks_to_send) - 1 and omitted_items > 0:
            fields.append({
                "name": f"ℹ️ +{omitted_items} productos adicionales en cola",
                "value": "Para ver el catálogo completo de alertas, consulta la [Consola de Fundador](https://calculadoracopete.firebaseapp.com/admin.html).",
                "inline": False,
            })

        embed = {
            "title": embed_title,
            "description": (
                f"Detecté **{len(chunk)}** productos durante el scraping que requieren tu atención.\n"
                f"Puedes revisarlos o desactivar SKUs en la [Consola de Fundador](https://calculadoracopete.firebaseapp.com/admin.html)."
            ),
            "color": 0xF59E0B,  # Ámbar advertencia
            "timestamp": now_iso,
            "footer": {"text": "Tooodles • Cuánto Rinde Guardian"},
            "fields": fields,
        }

        ok = _send_embeds_destination([embed], token, target_user, url)
        if not ok:
            all_success = False

        # Pausa de cortesía entre ráfagas para evitar HTTP 429
        if idx < len(chunks_to_send) - 1:
            time.sleep(INTER_CHUNK_SLEEP_SECONDS)

    return all_success


if __name__ == "__main__":
    if "--test" in sys.argv:
        cli_token = os.environ.get("DISCORD_BOT_TOKEN") or os.environ.get("token_priv")
        cli_uid = os.environ.get("DISCORD_USER_ID")
        cli_webhook = os.environ.get("DISCORD_WEBHOOK_URL")

        print("=== TEST DISCORD NOTIFIER (TOODLES) ===")
        print(f"Bot Token configurado: {'Sí' if cli_token else 'No'}")
        print(f"User ID configurado: {'Sí (' + cli_uid + ')' if cli_uid else 'No'}")
        print(f"Webhook URL configurada: {'Sí' if cli_webhook else 'No'}")

        send_discord_alert([], is_test=True)
