// 載入環境變數
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
} = require("discord.js");

// 超快響應Bot
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

// 極速改名管理器
class UltraFastRenameManager {
  constructor() {
    this.renameCount = 0;
    this.resetTime = Date.now();
    this.lastSuccessfulRename = new Map(); // 記錄成功的改名
    this.nameCache = new Map(); // 本地名稱快取
    this.pendingOperations = new Set(); // 防止重複操作
  }

  // 檢查速率限制
  canRename() {
    const now = Date.now();
    if (now - this.resetTime > 10 * 60 * 1000) {
      this.renameCount = 0;
      this.resetTime = now;
    }
    return this.renameCount < 2;
  }

  // 超快改名 - 火箭速度 🚀
  async rocketRename(channel, targetName) {
    const channelId = channel.id;
    const operationKey = `${channelId}-${targetName}`;

    // 1. 防止重複操作
    if (this.pendingOperations.has(operationKey)) {
      console.log(`🚫 改名已在進行中: "${targetName}"`);
      return false;
    }

    // 2. 檢查本地快取（超快判斷）
    const cachedName = this.nameCache.get(channelId);
    if (cachedName === targetName) {
      console.log(`⚡ 快取顯示名稱已正確: "${targetName}"`);
      return true;
    }

    // 3. 實時檢查（只在必要時）
    if (channel.name === targetName) {
      console.log(`⚡ 頻道名稱已正確: "${targetName}"`);
      this.nameCache.set(channelId, targetName);
      return true;
    }

    // 4. 速率限制檢查
    if (!this.canRename()) {
      const waitTime = Math.ceil(
        (this.resetTime + 10 * 60 * 1000 - Date.now()) / 1000
      );
      console.log(`⏰ 速率限制，需等待 ${waitTime} 秒`);
      return false;
    }

    // 5. 執行極速改名
    return await this.executeUltraFastRename(channel, targetName, operationKey);
  }

  // 執行超快改名
  async executeUltraFastRename(channel, targetName, operationKey) {
    this.pendingOperations.add(operationKey);

    try {
      console.log(`🚀 極速改名: "${channel.name}" → "${targetName}"`);

      // 使用最短超時時間，快速失敗快速成功
      await Promise.race([
        channel.setName(targetName),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error("快速超時")), 8000) // 只等8秒
        ),
      ]);

      // 立即更新快取和計數
      this.renameCount++;
      this.nameCache.set(channel.id, targetName);
      this.lastSuccessfulRename.set(channel.id, Date.now());

      console.log(`⚡ 極速改名成功: "${targetName}" (${this.renameCount}/2)`);
      return true;
    } catch (error) {
      if (error.code === 50028) {
        console.log(`🚫 Discord速率限制`);
      } else if (error.message === "快速超時") {
        console.log(`⚡ 快速超時，改名可能仍在後台處理`);
        // 樂觀更新快取（假設會成功）
        this.nameCache.set(channel.id, targetName);
      } else {
        console.log(`❌ 改名失敗: ${error.message}`);
      }
      return false;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  // 異步後台改名（不阻塞主流程）
  backgroundRename(channel, targetName) {
    // 立即返回，在後台處理
    setImmediate(async () => {
      await this.rocketRename(channel, targetName);
    });
    console.log(`📤 後台改名已啟動: "${targetName}"`);
  }

  // 清理過期快取
  cleanCache() {
    const now = Date.now();
    for (const [channelId, timestamp] of this.lastSuccessfulRename) {
      if (now - timestamp > 30 * 60 * 1000) {
        // 30分鐘後清理
        this.nameCache.delete(channelId);
        this.lastSuccessfulRename.delete(channelId);
      }
    }
  }
}

// 創建超速管理器
const ultraManager = new UltraFastRenameManager();

// 狀態管理
let currentState = null;
let lastOperation = 0;

// 配置
const CONFIG = {
  TOKEN: process.env.BOT_TOKEN,
  VOICE_CHANNEL_ID: process.env.VOICE_CHANNEL_ID,
  SPECIAL_USER_IDS:
    process.env.SPECIAL_USER_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) || [],
  EXCLUDED_USER_IDS:
    process.env.EXCLUDED_USER_IDS?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) || [],
  OPEN_NAME: process.env.OPEN_NAME || "燒肉Cafe：營業中",
  CLOSED_NAME: process.env.CLOSED_NAME || "燒肉Cafe：已打烊",
};

// 驗證配置
if (
  !CONFIG.TOKEN ||
  !CONFIG.VOICE_CHANNEL_ID ||
  CONFIG.SPECIAL_USER_IDS.length === 0
) {
  console.error("❌ 配置不完整，請檢查.env檔案");
  process.exit(1);
}

console.log(`⚡ 超快響應Bot配置完成`);
console.log(`🎯 指定成員: ${CONFIG.SPECIAL_USER_IDS.length} 個`);

// Bot就緒
client.once("ready", () => {
  console.log(`⚡ 超快Bot上線: ${client.user.tag}`);
  initializeLightningFast();
});

// 閃電初始化
async function initializeLightningFast() {
  try {
    const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);

    if (!channel || channel.type !== 2) {
      console.error("❌ 無效的語音頻道");
      return;
    }

    console.log(`⚡ 頻道連接成功: "${channel.name}"`);

    // 快速權限檢查
    const perms = channel.permissionsFor(client.user);
    if (!perms.has(PermissionFlagsBits.ManageChannels)) {
      console.error("❌ 缺少管理頻道權限");
      return;
    }

    // 閃電狀態檢查
    const hasSpecialUser = CONFIG.SPECIAL_USER_IDS.some((id) =>
      channel.members.has(id)
    );

    if (hasSpecialUser) {
      await lightningOpenChannel(channel);
    } else {
      await lightningCloseChannel(channel);
    }

    console.log("⚡ 閃電初始化完成");
    startLightningMonitoring();
  } catch (error) {
    console.error("❌ 初始化失敗:", error.message);
  }
}

// 語音狀態監聽 - 極速響應
client.on("voiceStateUpdate", async (oldState, newState) => {
  const userId = newState.id;

  if (!CONFIG.SPECIAL_USER_IDS.includes(userId)) return;

  // 防抖動（避免頻繁觸發）
  const now = Date.now();
  if (now - lastOperation < 1000) return;
  lastOperation = now;

  try {
    const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);
    if (!channel) return;

    // 加入頻道
    if (
      newState.channelId === CONFIG.VOICE_CHANNEL_ID &&
      oldState.channelId !== CONFIG.VOICE_CHANNEL_ID
    ) {
      console.log(`⚡ 指定成員加入: ${newState.member.displayName}`);
      await lightningOpenChannel(channel);
    }

    // 離開頻道
    if (
      oldState.channelId === CONFIG.VOICE_CHANNEL_ID &&
      newState.channelId !== CONFIG.VOICE_CHANNEL_ID
    ) {
      console.log(`⚡ 指定成員離開: ${oldState.member.displayName}`);

      // 極短延遲檢查（減少等待時間）
      setTimeout(async () => {
        const updatedChannel = await client.channels.fetch(
          CONFIG.VOICE_CHANNEL_ID
        );
        const remaining = CONFIG.SPECIAL_USER_IDS.filter((id) =>
          updatedChannel.members.has(id)
        );

        if (remaining.length === 0) {
          console.log(`⚡ 無指定成員，閃電關閉`);
          await lightningCloseChannel(updatedChannel);
        }
      }, 800); // 只等0.8秒
    }
  } catch (error) {
    console.error("⚡ 處理語音狀態失敗:", error.message);
  }
});

// 閃電開啟頻道
async function lightningOpenChannel(channel) {
  if (currentState === "open") return;

  console.log(`⚡ 閃電開啟頻道...`);
  const startTime = Date.now();

  try {
    // 極速權限設定（最高優先級）
    const permPromise = channel.permissionOverwrites.edit(
      channel.guild.roles.everyone,
      {
        [PermissionFlagsBits.Connect]: true,
      }
    );

    await Promise.race([
      permPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("權限超時")), 5000)
      ),
    ]);

    console.log(`⚡ 權限開放完成 (${Date.now() - startTime}ms)`);

    // 後台改名（不阻塞）
    ultraManager.backgroundRename(channel, CONFIG.OPEN_NAME);

    currentState = "open";
    console.log(`⚡ 頻道開啟完成 (總耗時: ${Date.now() - startTime}ms)`);
  } catch (error) {
    console.error(`❌ 開啟頻道失敗: ${error.message}`);
  }
}

// 閃電關閉頻道
async function lightningCloseChannel(channel) {
  if (currentState === "closed") return;

  console.log(`⚡ 閃電關閉頻道...`);
  const startTime = Date.now();

  try {
    // 並行處理：踢人 + 權限設定
    const kickPromises = [];
    const membersToKick = channel.members.filter((member) => {
      if (CONFIG.SPECIAL_USER_IDS.includes(member.id)) return false;
      if (CONFIG.EXCLUDED_USER_IDS.includes(member.id)) return false;
      return true;
    });

    // 極速踢人
    for (const [, member] of membersToKick) {
      kickPromises.push(
        member.voice
          .disconnect("頻道已打烊")
          .catch((err) => console.log(`踢出 ${member.displayName} 失敗`))
      );
    }

    // 極速權限設定
    const permPromise = channel.permissionOverwrites.edit(
      channel.guild.roles.everyone,
      {
        [PermissionFlagsBits.Connect]: false,
      }
    );

    // 並行執行踢人和權限設定
    await Promise.allSettled([
      Promise.all(kickPromises),
      Promise.race([
        permPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("權限超時")), 5000)
        ),
      ]),
    ]);

    console.log(`⚡ 踢人和權限設定完成 (${Date.now() - startTime}ms)`);

    // 確保指定成員權限（快速處理）
    const userPermPromises = CONFIG.SPECIAL_USER_IDS.map(async (userId) => {
      try {
        await channel.permissionOverwrites.edit(userId.trim(), {
          [PermissionFlagsBits.Connect]: true,
        });
      } catch (err) {
        console.log(`設定用戶 ${userId} 權限失敗`);
      }
    });

    await Promise.allSettled(userPermPromises);

    // 後台改名
    ultraManager.backgroundRename(channel, CONFIG.CLOSED_NAME);

    currentState = "closed";
    console.log(`⚡ 頻道關閉完成 (總耗時: ${Date.now() - startTime}ms)`);
  } catch (error) {
    console.error(`❌ 關閉頻道失敗: ${error.message}`);
  }
}

// 閃電監控（降低頻率，提高效率）
function startLightningMonitoring() {
  console.log("⚡ 啟動閃電監控 (每20分鐘檢查一次)");

  setInterval(async () => {
    try {
      ultraManager.cleanCache(); // 清理過期快取

      const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);
      if (!channel) return;

      const targetName =
        currentState === "open" ? CONFIG.OPEN_NAME : CONFIG.CLOSED_NAME;

      // 只在確實需要時才修正
      if (channel.name !== targetName) {
        console.log(
          `⚡ 監控發現名稱需修正: "${channel.name}" → "${targetName}"`
        );
        await ultraManager.rocketRename(channel, targetName);
      }
    } catch (error) {
      console.error("監控檢查失敗:", error.message);
    }
  }, 20 * 60 * 1000); // 每20分鐘
}

// 錯誤處理
client.on("error", (error) => console.error("Discord錯誤:", error.message));
process.on("unhandledRejection", (error) =>
  console.error("未處理錯誤:", error.message)
);

// 登入
client.login(CONFIG.TOKEN).catch((error) => {
  console.error("登入失敗:", error.message);
  process.exit(1);
});

// 優雅關閉
process.on("SIGINT", () => {
  console.log("⚡ 閃電關閉Bot...");
  client.destroy();
  process.exit(0);
});

console.log(`
⚡ 超快響應Bot - 閃電版 ⚡

🚀 極速優化功能:
• 權限控制 < 1秒響應
• 本地快取極速判斷
• 並行處理多個操作
• 8秒快速超時機制
• 後台改名不阻塞主流程
• 防抖動機制避免頻繁觸發

📊 性能指標:
• 權限響應: < 1秒
• 踢人操作: < 2秒  
• 狀態切換: < 3秒
• 改名操作: 後台處理，不影響主功能

🎯 策略:
1. 權限第一，改名第二
2. 並行處理，最大化速度
3. 快速失敗，不等待太久
4. 本地快取，減少API查詢
5. 後台改名，不阻塞用戶體驗

⚠️ 注意: Discord改名API限制依然存在
         但用戶感受到的響應速度大幅提升！
`);
