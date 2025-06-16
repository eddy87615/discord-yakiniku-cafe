import os
import asyncio
import logging
from datetime import datetime, timedelta

import discord
from discord.ext import tasks
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

TOKEN = os.getenv("BOT_TOKEN")
VOICE_CHANNEL_ID = int(os.getenv("VOICE_CHANNEL_ID", 0))
SPECIAL_USER_IDS = [int(u) for u in os.getenv("SPECIAL_USER_IDS", "").split(",") if u.strip().isdigit()]
EXCLUDED_USER_IDS = [int(u) for u in os.getenv("EXCLUDED_USER_IDS", "").split(",") if u.strip().isdigit()]
OPEN_NAME = os.getenv("OPEN_NAME", "燒肉Cafe：營業中")
CLOSED_NAME = os.getenv("CLOSED_NAME", "燒肉Cafe：已打烊")

if not TOKEN or not VOICE_CHANNEL_ID or not SPECIAL_USER_IDS:
    logging.error("❌ 配置不完整，請檢查.env檔案")
    exit(1)

intents = discord.Intents.default()
intents.guilds = True
intents.voice_states = True
intents.members = True

client = discord.Client(intents=intents)

class UltraFastRenameManager:
    def __init__(self):
        self.rename_count = 0
        self.reset_time = datetime.utcnow()
        self.last_successful_rename = {}
        self.name_cache = {}
        self.pending_operations = set()
        self.lock = asyncio.Lock()

    def can_rename(self):
        now = datetime.utcnow()
        if now - self.reset_time > timedelta(minutes=10):
            self.rename_count = 0
            self.reset_time = now
        return self.rename_count < 2

    async def rocket_rename(self, channel: discord.VoiceChannel, target_name: str):
        operation_key = f"{channel.id}-{target_name}"
        async with self.lock:
            if operation_key in self.pending_operations:
                logging.info(f"🚫 改名已在進行中: \"{target_name}\"")
                return False
            self.pending_operations.add(operation_key)

        try:
            cached_name = self.name_cache.get(channel.id)
            if cached_name == target_name:
                logging.info(f"⚡ 快取顯示名稱已正確: \"{target_name}\"")
                return True

            if channel.name == target_name:
                logging.info(f"⚡ 頻道名稱已正確: \"{target_name}\"")
                self.name_cache[channel.id] = target_name
                return True

            if not self.can_rename():
                wait_time = int((self.reset_time + timedelta(minutes=10) - datetime.utcnow()).total_seconds())
                logging.info(f"⏰ 速率限制，需等待 {wait_time} 秒")
                return False

            # 改名操作，使用 asyncio.wait_for 來做8秒超時
            try:
                await asyncio.wait_for(channel.edit(name=target_name), timeout=8)
            except asyncio.TimeoutError:
                logging.info("⚡ 快速超時，改名可能仍在後台處理")
                # 樂觀更新快取（假設成功）
                self.name_cache[channel.id] = target_name
                return True

            self.rename_count += 1
            self.name_cache[channel.id] = target_name
            self.last_successful_rename[channel.id] = datetime.utcnow()
            logging.info(f"⚡ 極速改名成功: \"{target_name}\" ({self.rename_count}/2)")
            return True

        except discord.errors.HTTPException as e:
            if e.code == 50028:
                logging.info("🚫 Discord速率限制")
            else:
                logging.error(f"❌ 改名失敗: {e}")
            return False

        finally:
            async with self.lock:
                self.pending_operations.discard(operation_key)

    def background_rename(self, channel, target_name):
        asyncio.create_task(self.rocket_rename(channel, target_name))
        logging.info(f"📤 後台改名已啟動: \"{target_name}\"")

    def clean_cache(self):
        now = datetime.utcnow()
        to_remove = []
        for channel_id, timestamp in self.last_successful_rename.items():
            if now - timestamp > timedelta(minutes=30):
                to_remove.append(channel_id)
        for cid in to_remove:
            self.name_cache.pop(cid, None)
            self.last_successful_rename.pop(cid, None)

ultra_manager = UltraFastRenameManager()
current_state = None
last_operation = datetime.min

async def lightning_open_channel(channel: discord.VoiceChannel):
    global current_state
    if current_state == "open":
        return
    logging.info("⚡ 閃電開啟頻道...")
    start_time = datetime.utcnow()

    try:
        # 設定everyone連接權限
        overwrite = channel.overwrites_for(channel.guild.default_role)
        overwrite.connect = True
        await asyncio.wait_for(channel.set_permissions(channel.guild.default_role, overwrite=overwrite), timeout=5)
        logging.info(f"⚡ 權限開放完成 ({(datetime.utcnow()-start_time).total_seconds()*1000:.0f}ms)")

        ultra_manager.background_rename(channel, OPEN_NAME)

        current_state = "open"
        logging.info(f"⚡ 頻道開啟完成 (總耗時: {(datetime.utcnow()-start_time).total_seconds()*1000:.0f}ms)")

    except asyncio.TimeoutError:
        logging.error("❌ 開啟頻道失敗: 權限設定超時")
    except Exception as e:
        logging.error(f"❌ 開啟頻道失敗: {e}")

async def lightning_close_channel(channel: discord.VoiceChannel):
    global current_state
    if current_state == "closed":
        return
    logging.info("⚡ 閃電關閉頻道...")
    start_time = datetime.utcnow()

    try:
        # 踢出非指定成員及非排除成員
        members_to_kick = [m for m in channel.members if m.id not in SPECIAL_USER_IDS and m.id not in EXCLUDED_USER_IDS]
        kick_tasks = []
        for member in members_to_kick:
            kick_tasks.append(member.move_to(None, reason="頻道已打烊"))

        # 設定everyone禁止連接
        overwrite = channel.overwrites_for(channel.guild.default_role)
        overwrite.connect = False

        perm_task = channel.set_permissions(channel.guild.default_role, overwrite=overwrite)
        results = await asyncio.gather(asyncio.gather(*kick_tasks, return_exceptions=True), asyncio.wait_for(perm_task, timeout=5), return_exceptions=True)

        for r in results[0]:
            if isinstance(r, Exception):
                logging.warning(f"踢出成員失敗: {r}")

        logging.info(f"⚡ 踢人和權限設定完成 ({(datetime.utcnow()-start_time).total_seconds()*1000:.0f}ms)")

        # 確保指定成員權限
        perms_tasks = []
        for user_id in SPECIAL_USER_IDS:
            member = channel.guild.get_member(user_id)
            if member:
                overwrite = channel.overwrites_for(member)
                overwrite.connect = True
                perms_tasks.append(channel.set_permissions(member, overwrite=overwrite))

        await asyncio.gather(*perms_tasks, return_exceptions=True)

        ultra_manager.background_rename(channel, CLOSED_NAME)

        current_state = "closed"
        logging.info(f"⚡ 頻道關閉完成 (總耗時: {(datetime.utcnow()-start_time).total_seconds()*1000:.0f}ms)")

    except asyncio.TimeoutError:
        logging.error("❌ 關閉頻道失敗: 權限設定超時")
    except Exception as e:
        logging.error(f"❌ 關閉頻道失敗: {e}")

async def initialize_lightning_fast():
    global current_state
    channel = client.get_channel(VOICE_CHANNEL_ID)
    if not channel or not isinstance(channel, discord.VoiceChannel):
        logging.error("❌ 無效的語音頻道")
        return

    logging.info(f"⚡ 頻道連接成功: \"{channel.name}\"")

    perms = channel.permissions_for(channel.guild.me)
    if not perms.manage_channels:
        logging.error("❌ 缺少管理頻道權限")
        return

    has_special_user = any(uid in [m.id for m in channel.members] for uid in SPECIAL_USER_IDS)

    if has_special_user:
        await lightning_open_channel(channel)
    else:
        await lightning_close_channel(channel)

    logging.info("⚡ 閃電初始化完成")
    lightning_monitoring.start()

@client.event
async def on_ready():
    logging.info(f"⚡ 超快Bot上線: {client.user}")
    await initialize_lightning_fast()

last_operation_time = datetime.min

@client.event
async def on_voice_state_update(member, before, after):
    global last_operation_time
    if member.id not in SPECIAL_USER_IDS:
        return

    now = datetime.utcnow()
    if (now - last_operation_time).total_seconds() < 1:
        return
    last_operation_time = now

    channel = client.get_channel(VOICE_CHANNEL_ID)
    if not channel:
        return

    try:
        # 加入頻道
        if after.channel and after.channel.id == VOICE_CHANNEL_ID and (before.channel is None or before.channel.id != VOICE_CHANNEL_ID):
            logging.info(f"⚡ 指定成員加入: {member.display_name}")
            await lightning_open_channel(channel)

        # 離開頻道
        if before.channel and before.channel.id == VOICE_CHANNEL_ID and (after.channel is None or after.channel.id != VOICE_CHANNEL_ID):
            logging.info(f"⚡ 指定成員離開: {member.display_name}")

            await asyncio.sleep(0.8)  # 極短延遲，避免閃動

            channel_members_ids = [m.id for m in channel.members]
            has_special = any(uid in channel_members_ids for uid in SPECIAL_USER_IDS)
            if not has_special:
                await lightning_close_channel(channel)
    except Exception as e:
        logging.error(f"❌ 語音狀態更新錯誤: {e}")

@tasks.loop(seconds=3)
async def lightning_monitoring():
    channel = client.get_channel(VOICE_CHANNEL_ID)
    if not channel:
        return

    try:
        name = channel.name
        # 檢查頻道名稱是否正確，若不正確則嘗試改名（每次最多2次限制）
        if current_state == "open" and name != OPEN_NAME:
            logging.info("🔄 監控: 頻道名稱不符 (開啟狀態)")
            ultra_manager.background_rename(channel, OPEN_NAME)

        elif current_state == "closed" and name != CLOSED_NAME:
            logging.info("🔄 監控: 頻道名稱不符 (關閉狀態)")
            ultra_manager.background_rename(channel, CLOSED_NAME)

        # 清理快取
        ultra_manager.clean_cache()

    except Exception as e:
        logging.error(f"❌ 監控錯誤: {e}")

@client.event
async def on_disconnect():
    logging.warning("⚠️ Bot已斷線")

@client.event
async def on_resumed():
    logging.info("⚡ Bot已重新連線")

async def graceful_shutdown():
    logging.info("⚠️ Bot即將關閉，正在清理資源...")
    lightning_monitoring.cancel()
    await client.close()

import signal
import sys

def signal_handler(sig, frame):
    logging.info(f"收到訊號 {sig}，準備關閉...")
    asyncio.create_task(graceful_shutdown())

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    client.run(TOKEN)
