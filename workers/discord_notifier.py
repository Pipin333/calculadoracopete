import os
import sys
import json
import datetime
import requests

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def format_clp(amount):
    try:
        return f"${int(amount):,}".replace(",", ".")
    except Exception:
        return f"${amount}"

def send_discord_dm(bot_token, user_id, embeds):
    """
    Envía un Mensaje Directo (DM) privado a un usuario de Discord usando el Bot Tooodles.
    Utiliza Discord REST API v10 directamente (sin necesidad de procesos gateway en ejecución).
    """
    headers = {
        "Authorization": f"Bot {bot_token.strip()}",
        "Content-Type": "application/json"
    }

    # 1. Abrir o recuperar el canal de DM con el usuario
    dm_url = "https://discord.com/api/v10/users/@me/channels"
    try:
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
        if msg_res.status_code in [200, 201]:
            print(f"[Discord DM] ✅ DM privado enviado exitosamente vía Tooodles a {user_id}.")
            return True
        else:
            print(f"[Discord DM] ❌ Error enviando mensaje a canal {dm_channel_id}: Status {msg_res.status_code} - {msg_res.text}")
            return False
    except Exception as e:
        print(f"[Discord DM] ❌ Excepción enviando DM: {e}")
        return False

def send_discord_webhook(webhook_url, embeds):
    """Envía embeds a un canal de texto a través de un Webhook."""
    payload = {
        "username": "Tooodles • Cuánto Rinde",
        "avatar_url": "https://raw.githubusercontent.com/username/calculadoracopete/main/favicon.ico",
        "embeds": embeds
    }
    try:
        res = requests.post(webhook_url.strip(), json=payload, timeout=10)
        if res.status_code in [200, 204]:
            print(f"[Discord Webhook] ✅ Alerta enviada exitosamente al canal.")
            return True
        else:
            print(f"[Discord Webhook] ❌ Error status {res.status_code}: {res.text}")
            return False
    except Exception as e:
        print(f"[Discord Webhook] ❌ Excepción: {e}")
        return False

def send_discord_alert(flagged_items, webhook_url=None, bot_token=None, user_id=None, title=None, is_test=False):
    """
    Envía una alerta formateada a Discord.
    Prioridad:
    1. Si hay DISCORD_BOT_TOKEN (o token_priv) y DISCORD_USER_ID -> Envía DM directo privado vía Tooodles.
    2. Si hay DISCORD_WEBHOOK_URL -> Envía a canal vía Webhook.
    """
    token = bot_token or os.environ.get("DISCORD_BOT_TOKEN") or os.environ.get("token_priv")
    target_user = user_id or os.environ.get("DISCORD_USER_ID")
    url = webhook_url or os.environ.get("DISCORD_WEBHOOK_URL")

    use_dm = bool(token and target_user)
    use_webhook = bool(url and not use_dm)

    if not use_dm and not use_webhook:
        print("[Discord Notifier] ℹ️ Ni DISCORD_BOT_TOKEN/DISCORD_USER_ID ni DISCORD_WEBHOOK_URL están configurados. Omitiendo alerta.")
        return False

    if not flagged_items and not is_test:
        print("[Discord Notifier] ℹ️ No hay items sospechosos para reportar.")
        return True

    now_iso = datetime.datetime.utcnow().isoformat() + "Z"

    if is_test:
        test_embed = {
            "title": "🎶 Tooodles: Test de Alertas Cuánto Rinde",
            "description": (
                "¡Hola! Tu bot **Tooodles** está conectado correctamente.\n"
                "A partir de ahora, cada vez que el scraper diario detecte un falso positivo o item sospechoso, te avisará directamente por este chat privado."
            ),
            "color": 0x10B981, # Verde esmeralda
            "timestamp": now_iso,
            "footer": {"text": "Tooodles Guardian • Cuánto Rinde"},
            "fields": [
                {"name": "Modo de Envío", "value": "📬 Mensaje Directo (DM Privado)" if use_dm else "📢 Webhook de Canal", "inline": True},
                {"name": "Consola de Fundador", "value": "[Abrir Panel Admin](https://calculadoracopete.firebaseapp.com/admin.html)", "inline": True}
            ]
        }

        if use_dm:
            return send_discord_dm(token, target_user, [test_embed])
        else:
            return send_discord_webhook(url, [test_embed])

    # Batching en grupos de 10 productos para no exceder límites de Discord
    chunk_size = 10
    chunks = [flagged_items[i:i + chunk_size] for i in range(0, len(flagged_items), chunk_size)]
    total_items = len(flagged_items)
    all_success = True

    for idx, chunk in enumerate(chunks):
        embed_title = title or f"🚨 Alerta de Catálogo: {total_items} Items a Revisar"
        if len(chunks) > 1:
            embed_title += f" (Parte {idx + 1}/{len(chunks)})"

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
                "inline": False
            })

        embed = {
            "title": embed_title,
            "description": (
                f"Detecté **{len(chunk)}** productos durante el scraping que requieren tu atención.\n"
                f"Puedes revisarlos o desactivar SKUs en la [Consola de Fundador](https://calculadoracopete.firebaseapp.com/admin.html)."
            ),
            "color": 0xF59E0B, # Ámbar advertencia
            "timestamp": now_iso,
            "footer": {"text": "Tooodles • Cuánto Rinde Guardian"},
            "fields": fields
        }

        if use_dm:
            ok = send_discord_dm(token, target_user, [embed])
        else:
            ok = send_discord_webhook(url, [embed])

        if not ok:
            all_success = False

    return all_success

if __name__ == "__main__":
    if "--test" in sys.argv:
        token = os.environ.get("DISCORD_BOT_TOKEN") or os.environ.get("token_priv")
        uid = os.environ.get("DISCORD_USER_ID")
        webhook = os.environ.get("DISCORD_WEBHOOK_URL")

        print("=== TEST DISCORD NOTIFIER (TOODLES) ===")
        print(f"Bot Token configurado: {'Sí' if token else 'No'}")
        print(f"User ID configurado: {'Sí (' + uid + ')' if uid else 'No'}")
        print(f"Webhook URL configurada: {'Sí' if webhook else 'No'}")

        send_discord_alert([], is_test=True)
