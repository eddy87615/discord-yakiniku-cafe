require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  AttachmentBuilder,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// 超快響應Bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// 輔助函數來處理 Discord.js 新版本的 ephemeral 回覆
function createEphemeralReply(content, embeds = null) {
  const replyOptions = {
    flags: [4096], // EPHEMERAL flag
  };

  if (typeof content === "string") {
    replyOptions.content = content;
  }

  if (embeds) {
    replyOptions.embeds = Array.isArray(embeds) ? embeds : [embeds];
  }

  return replyOptions;
}

function createPublicReply(content, embeds = null, components = null) {
  const replyOptions = {};

  if (typeof content === "string") {
    replyOptions.content = content;
  }

  if (embeds) {
    replyOptions.embeds = Array.isArray(embeds) ? embeds : [embeds];
  }

  if (components) {
    replyOptions.components = Array.isArray(components)
      ? components
      : [components];
  }

  return replyOptions;
}

// 極速改名管理器 (保留原有功能)
class UltraFastRenameManager {
  constructor() {
    this.renameCount = 0;
    this.resetTime = Date.now();
    this.lastSuccessfulRename = new Map();
    this.nameCache = new Map();
    this.pendingOperations = new Set();
  }

  canRename() {
    const now = Date.now();
    if (now - this.resetTime > 10 * 60 * 1000) {
      this.renameCount = 0;
      this.resetTime = now;
    }
    return this.renameCount < 2;
  }

  async rocketRename(channel, targetName) {
    const channelId = channel.id;
    const operationKey = `${channelId}-${targetName}`;

    if (this.pendingOperations.has(operationKey)) {
      console.log(`🚫 改名已在進行中: "${targetName}"`);
      return false;
    }

    const cachedName = this.nameCache.get(channelId);
    if (cachedName === targetName) {
      console.log(`⚡ 快取顯示名稱已正確: "${targetName}"`);
      return true;
    }

    if (channel.name === targetName) {
      console.log(`⚡ 頻道名稱已正確: "${targetName}"`);
      this.nameCache.set(channelId, targetName);
      return true;
    }

    if (!this.canRename()) {
      const waitTime = Math.ceil(
        (this.resetTime + 10 * 60 * 1000 - Date.now()) / 1000
      );
      console.log(`⏰ 速率限制，需等待 ${waitTime} 秒`);
      return false;
    }

    return await this.executeUltraFastRename(channel, targetName, operationKey);
  }

  async executeUltraFastRename(channel, targetName, operationKey) {
    this.pendingOperations.add(operationKey);

    try {
      console.log(`🚀 極速改名: "${channel.name}" → "${targetName}"`);

      await Promise.race([
        channel.setName(targetName),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("快速超時")), 8000)
        ),
      ]);

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
        this.nameCache.set(channel.id, targetName);
      } else {
        console.log(`❌ 改名失敗: ${error.message}`);
      }
      return false;
    } finally {
      this.pendingOperations.delete(operationKey);
    }
  }

  backgroundRename(channel, targetName) {
    setImmediate(async () => {
      await this.rocketRename(channel, targetName);
    });
    console.log(`📤 後台改名已啟動: "${targetName}"`);
  }

  cleanCache() {
    const now = Date.now();
    for (const [channelId, timestamp] of this.lastSuccessfulRename) {
      if (now - timestamp > 30 * 60 * 1000) {
        this.nameCache.delete(channelId);
        this.lastSuccessfulRename.delete(channelId);
      }
    }
  }
}

// 咖啡廳經營系統
class CoffeeShopManager {
  constructor() {
    this.dataPath = "./coffee_shop_data.json";
    this.loadData();
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, "utf8"));
        this.data = {
          users: data.users || {},
          menu: data.menu || [],
          shopAccount: data.shopAccount || 0,
          settings: {
            managerRoleId: data.settings?.managerRoleId || "",
            menuChannelId: data.settings?.menuChannelId || "",
            messageReward: data.settings?.messageReward || 5,
            voiceReward: data.settings?.voiceReward || 10,
            dailyReward: data.settings?.dailyReward || 100,
            pointsPerPurchase: data.settings?.pointsPerPurchase || 1,
            pointsToReward: data.settings?.pointsToReward || 10,
            ...data.settings,
          },
          rewardShop: data.rewardShop || [
            {
              id: "cash100",
              name: "現金獎勵",
              description: "獲得100元現金",
              cost: 10,
              type: "money",
              value: 100,
              emoji: "💰",
            },
            {
              id: "cash200",
              name: "現金大獎",
              description: "獲得200元現金",
              cost: 20,
              type: "money",
              value: 200,
              emoji: "💎",
            },
            {
              id: "double_points",
              name: "雙倍集點卡",
              description: "下次購買獲得雙倍集點",
              cost: 15,
              type: "buff",
              value: "double_points",
              emoji: "✨",
            },
            {
              id: "free_drink",
              name: "免費飲料券",
              description: "免費獲得一杯隨機飲料",
              cost: 8,
              type: "item",
              value: "random_drink",
              emoji: "🎫",
            },
            {
              id: "vip_title",
              name: "VIP會員稱號",
              description: "獲得特殊身分標記",
              cost: 50,
              type: "title",
              value: "VIP會員",
              emoji: "👑",
            },
            {
              id: "lucky_box",
              name: "幸運寶箱",
              description: "隨機獲得50-150元",
              cost: 12,
              type: "lucky",
              value: [50, 150],
              emoji: "📦",
            },
          ],
          dailyStats: {
            date: data.dailyStats?.date || new Date().toDateString(),
            sales: data.dailyStats?.sales || 0,
            customers: new Set(), // 先初始化為空 Set
          },
        };

        // 安全地恢復 customers 數據
        if (data.dailyStats?.customers) {
          if (Array.isArray(data.dailyStats.customers)) {
            this.data.dailyStats.customers = new Set(data.dailyStats.customers);
            console.log(
              `📋 從陣列恢復 customers 資料，共 ${this.data.dailyStats.customers.size} 位顧客`
            );
          } else {
            console.log("⚠️ customers 資料格式異常，使用空 Set");
            this.data.dailyStats.customers = new Set();
          }
        }

        console.log(`📋 從檔案載入菜單，共 ${this.data.menu.length} 個項目`);
        console.log(
          `🎁 載入兌換商店，共 ${this.data.rewardShop.length} 個獎勵`
        );
      } else {
        console.log("📝 首次啟動，創建新的資料檔案");
        this.initializeDefaultData();
      }
    } catch (error) {
      console.error("❌ 載入資料時發生錯誤:", error);
      console.log("🔄 初始化預設資料");
      this.initializeDefaultData();
    }
  }

  initializeDefaultData() {
    this.data = {
      users: {},
      menu: [],
      shopAccount: 0,
      settings: {
        managerRoleId: "",
        menuChannelId: "",
        messageReward: 5,
        voiceReward: 10,
        dailyReward: 100,
        pointsPerPurchase: 1,
        pointsToReward: 10,
      },
      rewardShop: [
        {
          id: "cash100",
          name: "現金獎勵",
          description: "獲得100元現金",
          cost: 10,
          type: "money",
          value: 100,
          emoji: "💰",
        },
        {
          id: "cash200",
          name: "現金大獎",
          description: "獲得200元現金",
          cost: 20,
          type: "money",
          value: 200,
          emoji: "💎",
        },
        {
          id: "double_points",
          name: "雙倍集點卡",
          description: "下次購買獲得雙倍集點",
          cost: 15,
          type: "buff",
          value: "double_points",
          emoji: "✨",
        },
        {
          id: "free_drink",
          name: "免費飲料券",
          description: "免費獲得一杯隨機飲料",
          cost: 8,
          type: "item",
          value: "random_drink",
          emoji: "🎫",
        },
        {
          id: "vip_title",
          name: "VIP會員稱號",
          description: "獲得特殊身分標記",
          cost: 50,
          type: "title",
          value: "VIP會員",
          emoji: "👑",
        },
        {
          id: "lucky_box",
          name: "幸運寶箱",
          description: "隨機獲得50-150元",
          cost: 12,
          type: "lucky",
          value: [50, 150],
          emoji: "📦",
        },
      ],
      dailyStats: {
        date: new Date().toDateString(),
        sales: 0,
        customers: new Set(),
      },
    };
    console.log("✨ 初始化空菜單，請使用 /快速設定菜單 來建立菜單項目");
  }

  saveData() {
    try {
      // 確保 customers 在保存前轉換為陣列
      const dataToSave = {
        ...this.data,
        dailyStats: {
          ...this.data.dailyStats,
          customers:
            this.data.dailyStats.customers instanceof Set
              ? Array.from(this.data.dailyStats.customers)
              : Array.isArray(this.data.dailyStats.customers)
              ? this.data.dailyStats.customers
              : [], // 如果都不是，設為空陣列
        },
      };

      fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2));
      console.log("💾 資料保存成功");
    } catch (error) {
      console.error("❌ 儲存資料時發生錯誤:", error);
    }
  }

  initUser(userId) {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        money: 0,
        points: 0,
        lastDaily: 0,
        totalEarned: 0,
        totalSpent: 0,
        purchaseHistory: [],
        joinTime: Date.now(),
        lastVoiceTime: 0,
      };
      this.saveData();
    }
    return this.data.users[userId];
  }

  addMoney(userId, amount, reason = "系統獎勵") {
    const user = this.initUser(userId);
    user.money += amount;
    user.totalEarned += amount;
    this.saveData();
    console.log(`💰 ${userId} 獲得 ${amount} 元 (${reason})`);
  }

  // 同時需要修改 CoffeeShopManager 類，添加處理雙倍集點的邏輯
  // 在 purchaseItem 方法中添加：
  purchaseItem(userId, itemId) {
    const user = this.initUser(userId);
    const item = this.data.menu.find((i) => i.id === itemId);

    if (!item) return { success: false, message: "商品不存在" };
    if (user.money < item.price) return { success: false, message: "金額不足" };

    user.money -= item.price;
    user.totalSpent += item.price;

    // 檢查是否有雙倍集點
    let pointsToAdd = this.data.settings.pointsPerPurchase;
    if (user.doublePointsNext) {
      pointsToAdd *= 2;
      user.doublePointsNext = false; // 使用後清除
    }

    user.points += pointsToAdd;
    user.purchaseHistory.push({
      item: item.name,
      price: item.price,
      time: Date.now(),
    });

    this.data.shopAccount += item.price;
    this.updateDailyStats(userId, item.price);

    this.saveData();
    return {
      success: true,
      item: item,
      newBalance: user.money,
      points: user.points,
      pointsEarned: pointsToAdd, // 新增：返回獲得的集點數
    };
  }

  updateDailyStats(userId, amount) {
    const today = new Date().toDateString();
    if (this.data.dailyStats.date !== today) {
      this.data.dailyStats = {
        date: today,
        sales: 0,
        customers: new Set(),
      };
    }

    // 確保 customers 是 Set 對象，修復序列化問題
    if (
      !this.data.dailyStats.customers ||
      typeof this.data.dailyStats.customers.add !== "function"
    ) {
      console.log("🔧 修復 customers 為 Set 對象");

      // 如果是陣列，轉換為 Set
      if (Array.isArray(this.data.dailyStats.customers)) {
        this.data.dailyStats.customers = new Set(
          this.data.dailyStats.customers
        );
      } else {
        // 如果是其他格式，重置為空 Set
        this.data.dailyStats.customers = new Set();
      }
    }

    this.data.dailyStats.sales += amount;
    this.data.dailyStats.customers.add(userId);

    console.log(
      `📊 更新每日統計: 營收 ${this.data.dailyStats.sales} 元, 顧客 ${this.data.dailyStats.customers.size} 人`
    );
  }

  checkDailyReward(userId) {
    const user = this.initUser(userId);
    const today = new Date().toDateString();
    const lastDaily = new Date(user.lastDaily).toDateString();

    if (today === lastDaily) {
      return { success: false, message: "今天已經簽到過了！" };
    }

    user.money += this.data.settings.dailyReward;
    user.totalEarned += this.data.settings.dailyReward;
    user.lastDaily = Date.now();
    this.saveData();

    return {
      success: true,
      reward: this.data.settings.dailyReward,
      newBalance: user.money,
    };
  }

  redeemPoints(userId) {
    const user = this.initUser(userId);
    if (user.points < this.data.settings.pointsToReward) {
      return {
        success: false,
        message: `集點不足！需要 ${this.data.settings.pointsToReward} 點，目前有 ${user.points} 點`,
      };
    }

    const reward = this.data.settings.dailyReward;
    user.points -= this.data.settings.pointsToReward;
    user.money += reward;
    user.totalEarned += reward;
    this.saveData();

    return {
      success: true,
      reward: reward,
      remainingPoints: user.points,
      newBalance: user.money,
    };
  }

  isManager(member) {
    return (
      this.data.settings.managerRoleId &&
      member.roles.cache.has(this.data.settings.managerRoleId)
    );
  }

  isAdmin(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
  }

  // 資料完整性檢查方法
  validateData() {
    let fixes = [];

    // 檢查並修復 users 資料
    if (!this.data.users || typeof this.data.users !== "object") {
      this.data.users = {};
      fixes.push("修復用戶資料結構");
    }

    // 檢查並修復 menu 資料
    if (!Array.isArray(this.data.menu)) {
      this.data.menu = [];
      fixes.push("修復菜單資料結構");
    }

    // 檢查並修復 dailyStats
    if (!this.data.dailyStats || typeof this.data.dailyStats !== "object") {
      this.data.dailyStats = {
        date: new Date().toDateString(),
        sales: 0,
        customers: new Set(),
      };
      fixes.push("修復每日統計資料");
    }

    // 確保 customers 是 Set
    if (!(this.data.dailyStats.customers instanceof Set)) {
      if (Array.isArray(this.data.dailyStats.customers)) {
        this.data.dailyStats.customers = new Set(
          this.data.dailyStats.customers
        );
      } else {
        this.data.dailyStats.customers = new Set();
      }
      fixes.push("修復顧客資料格式");
    }

    if (fixes.length > 0) {
      console.log(`🔧 資料完整性檢查完成，修復項目: ${fixes.join(", ")}`);
      this.saveData();
    }

    return fixes;
  }
}

// 創建管理器實例
const ultraManager = new UltraFastRenameManager();
const coffeeShop = new CoffeeShopManager();

// 狀態管理 (保留原有功能)
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

// Bot就緒
client.once("ready", () => {
  console.log(`⚡ 增強版咖啡廳Bot上線: ${client.user.tag}`);
  initializeLightningFast();
  registerSlashCommands();
  startMonitoring();

  // 執行資料完整性檢查
  coffeeShop.validateData();
});

// 開始監控系統
function startMonitoring() {
  setInterval(() => {
    const guild = client.guilds.cache.first();
    if (!guild) return;

    // 遍歷所有語音頻道
    guild.channels.cache.forEach((channel) => {
      if (channel.type === 2) {
        // 語音頻道
        channel.members.forEach((member) => {
          if (member.user.bot) return;

          coffeeShop.addMoney(
            member.id,
            coffeeShop.data.settings.voiceReward,
            "語音掛機"
          );
        });
      }
    });
  }, 60000);

  setInterval(() => {
    ultraManager.cleanCache();
  }, 20 * 60 * 1000);
}

setInterval(() => {
  ultraManager.cleanCache();
}, 20 * 60 * 1000);

// 訊息事件 - 賺錢系統
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  coffeeShop.addMoney(
    message.author.id,
    coffeeShop.data.settings.messageReward,
    "發送訊息"
  );
});

// 語音狀態更新事件 (保留原有功能)
client.on("voiceStateUpdate", async (oldState, newState) => {
  const userId = newState.id;

  if (!CONFIG.SPECIAL_USER_IDS.includes(userId)) return;

  const now = Date.now();
  if (now - lastOperation < 1000) return;
  lastOperation = now;

  try {
    const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);
    if (!channel) return;

    if (
      newState.channelId === CONFIG.VOICE_CHANNEL_ID &&
      oldState.channelId !== CONFIG.VOICE_CHANNEL_ID
    ) {
      console.log(`⚡ 指定成員加入: ${newState.member.displayName}`);
      await lightningOpenChannel(channel);
    }

    if (
      oldState.channelId === CONFIG.VOICE_CHANNEL_ID &&
      newState.channelId !== CONFIG.VOICE_CHANNEL_ID
    ) {
      console.log(`⚡ 指定成員離開: ${oldState.member.displayName}`);

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
      }, 800);
    }
  } catch (error) {
    console.error("⚡ 處理語音狀態失敗:", error.message);
  }
});

// 斜線指令處理
client.on("interactionCreate", async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  } else if (interaction.isButton()) {
    await handleButtonInteraction(interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
  }
});

// 修復後的斜線指令註冊函數
async function registerSlashCommands() {
  const commands = [
    // 用戶指令
    new SlashCommandBuilder()
      .setName("請客")
      .setDescription("請朋友喝飲料")
      .addUserOption((option) =>
        option.setName("朋友").setDescription("要請客的朋友").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("商品")
          .setDescription("要請的商品名稱")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption((option) =>
        option.setName("留言").setDescription("給朋友的留言").setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName("錢包")
      .setDescription("查看自己或他人的錢包")
      .addUserOption((option) =>
        option
          .setName("玩家")
          .setDescription("查看指定玩家的錢包（僅店長）")
          .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName("簽到")
      .setDescription("每日簽到領取獎勵"),

    new SlashCommandBuilder().setName("菜單").setDescription("查看咖啡廳菜單"),

    new SlashCommandBuilder()
      .setName("集點商店")
      .setDescription("查看集點兌換商店"),

    new SlashCommandBuilder()
      .setName("集點兌換")
      .setDescription("使用集點兌換獎勵")
      .addStringOption((option) =>
        option
          .setName("獎勵")
          .setDescription("要兌換的獎勵")
          .setRequired(true)
          .setAutocomplete(true)
      ),

    new SlashCommandBuilder()
      .setName("退款")
      .setDescription("申請最近一筆購買的退款（5分鐘內）")
      .addUserOption((option) =>
        option
          .setName("玩家")
          .setDescription("要退款的玩家（僅店長）")
          .setRequired(false)
      ),

    // 店長指令
    new SlashCommandBuilder()
      .setName("發布菜單")
      .setDescription("發布互動式菜單（僅店長）"),

    new SlashCommandBuilder()
      .setName("編輯菜單")
      .setDescription("編輯咖啡廳菜單（僅店長）")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("新增")
          .setDescription("新增菜單項目")
          .addStringOption((option) =>
            option
              .setName("id")
              .setDescription("項目ID（英文）")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option.setName("名稱").setDescription("項目名稱").setRequired(true)
          )
          .addIntegerOption((option) =>
            option.setName("價格").setDescription("項目價格").setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("表情符號")
              .setDescription("項目表情符號")
              .setRequired(false)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("刪除")
          .setDescription("刪除菜單項目")
          .addStringOption((option) =>
            option
              .setName("id")
              .setDescription("要刪除的項目ID")
              .setRequired(true)
          )
      ),

    new SlashCommandBuilder()
      .setName("營收報告")
      .setDescription("查看咖啡廳營收報告（僅店長）"),

    new SlashCommandBuilder()
      .setName("發薪水")
      .setDescription("發放薪水給玩家（僅店長）")
      .addUserOption((option) =>
        option
          .setName("玩家")
          .setDescription("要發薪水的玩家")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option.setName("金額").setDescription("薪水金額").setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("快速設定菜單")
      .setDescription("一鍵建立預設菜單項目（僅店長）"),

    new SlashCommandBuilder()
      .setName("除錯菜單")
      .setDescription("檢查菜單資料狀態（僅店長）"),

    new SlashCommandBuilder()
      .setName("設定")
      .setDescription("咖啡廳設定（僅管理員）")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("店長身分組")
          .setDescription("設定店長身分組")
          .addRoleOption((option) =>
            option
              .setName("身分組")
              .setDescription("店長身分組")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("菜單頻道")
          .setDescription("設定菜單發布頻道")
          .addChannelOption((option) =>
            option
              .setName("頻道")
              .setDescription("菜單發布頻道")
              .setRequired(true)
          )
      ),

    new SlashCommandBuilder()
      .setName("語音統計")
      .setDescription("查看語音掛機統計（僅店長）"),
  ];

  try {
    console.log("🔄 開始註冊斜線指令...");
    console.log(`📋 準備註冊 ${commands.length} 個指令:`);

    // 詳細列出每個指令
    commands.forEach((cmd, index) => {
      console.log(`${index + 1}. /${cmd.name} - ${cmd.description}`);
    });

    // 驗證指令數量
    if (commands.length !== 15) {
      console.warn(`⚠️ 警告：預期 15 個指令，實際只有 ${commands.length} 個！`);
    }

    // 強制重新註冊所有指令
    console.log("🔄 清除舊指令並重新註冊...");

    // 方法1：直接設定新指令（推薦）
    const result = await client.application.commands.set(commands);
    console.log(`✅ 成功註冊 ${result.size} 個指令！`);

    // 驗證註冊結果
    const registeredCommands = await client.application.commands.fetch();
    console.log(`📋 實際註冊的指令 (${registeredCommands.size} 個):`);

    registeredCommands.forEach((cmd) => {
      console.log(`- /${cmd.name} (ID: ${cmd.id})`);
    });

    // 檢查是否有遺漏的指令
    const expectedNames = commands.map((cmd) => cmd.name);
    const actualNames = Array.from(registeredCommands.values()).map(
      (cmd) => cmd.name
    );
    const missing = expectedNames.filter((name) => !actualNames.includes(name));

    if (missing.length > 0) {
      console.log(`⚠️ 遺漏的指令: ${missing.join(", ")}`);
    } else {
      console.log("✅ 所有指令都已成功註冊！");
    }

    return true;
  } catch (error) {
    console.error("❌ 註冊斜線指令時發生錯誤:", error);

    // 詳細錯誤診斷
    if (error.code === 50001) {
      console.error("❌ 缺少權限：機器人沒有 'applications.commands' 權限");
    } else if (error.code === 50035) {
      console.error("❌ 無效的表單內容：指令格式錯誤");
      console.error("錯誤詳情:", error.rawError?.errors);
    } else {
      console.error("❌ 其他錯誤:", error.message);
    }

    return false;
  }
}

// 修復後的 handleSlashCommand 函數
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "錢包":
        await handleWalletCommand(interaction);
        break;
      case "簽到":
        await handleDailyCommand(interaction);
        break;
      case "菜單":
        await handleMenuCommand(interaction);
        break;
      case "集點商店":
        await handleRewardShopCommand(interaction);
        break;
      case "集點兌換":
        await handleRedeemPointsCommand(interaction);
        break;
      case "退款":
        await handleRefundCommand(interaction);
        break;
      case "請客":
        await handleTreatCommand(interaction);
        break;
      case "發布菜單":
        await handlePublishMenuCommand(interaction);
        break;
      case "編輯菜單":
        await handleEditMenuCommand(interaction);
        break;
      case "營收報告":
        await handleRevenueReportCommand(interaction);
        break;
      case "發薪水":
        await handlePaySalaryCommand(interaction);
        break;
      case "快速設定菜單":
        await handleQuickSetupMenuCommand(interaction);
        break;
      case "除錯菜單":
        await handleDebugMenuCommand(interaction);
        break;
      case "設定":
        await handleSettingsCommand(interaction);
        break;
      case "語音統計":
        await handleVoiceStatsCommand(interaction);
        break;
      default:
        console.log(`❌ 未知指令: ${commandName}`);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply(createEphemeralReply("❌ 未知的指令！"));
        }
        break;
    }
  } catch (error) {
    console.error(`❌ 處理指令 ${commandName} 時發生錯誤:`, error);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(
          createEphemeralReply("❌ 處理指令時發生錯誤！請稍後再試。")
        );
      } else if (interaction.deferred) {
        await interaction.editReply(
          createEphemeralReply("❌ 處理指令時發生錯誤！請稍後再試。")
        );
      }
    } catch (replyError) {
      console.error("❌ 無法回覆錯誤訊息:", replyError);
    }
  }
}

// 強制重新註冊指令的輔助函數
async function forceReregisterCommands() {
  try {
    console.log("🔄 強制清除並重新註冊所有指令...");

    // 清除所有現有指令
    await client.application.commands.set([]);
    console.log("🗑️ 已清除所有舊指令");

    // 等待一秒
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 重新註冊
    const success = await registerSlashCommands();

    if (success) {
      console.log("✅ 強制重新註冊完成！");
    } else {
      console.log("❌ 強制重新註冊失敗！");
    }

    return success;
  } catch (error) {
    console.error("❌ 強制重新註冊過程中發生錯誤:", error);
    return false;
  }
}

// 語音統計指令
async function handleVoiceStatsCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店長和管理員可以查看語音統計！")
    );
  }

  const guild = interaction.guild;
  let totalUsers = 0;
  let channelStats = [];

  guild.channels.cache
    .filter((channel) => channel.type === 2)
    .forEach((voiceChannel) => {
      const memberCount = voiceChannel.members.filter((m) => !m.user.bot).size;
      if (memberCount > 0) {
        totalUsers += memberCount;
        channelStats.push({
          name: voiceChannel.name,
          count: memberCount,
          reward: memberCount * coffeeShop.data.settings.voiceReward,
        });
      }
    });

  const embed = new EmbedBuilder()
    .setTitle("🎙️ 語音掛機統計")
    .setColor("#00FF7F")
    .addFields(
      {
        name: "👥 總在線人數",
        value: `${totalUsers} 人`,
        inline: true,
      },
      {
        name: "💰 每分鐘發放",
        value: `${totalUsers * coffeeShop.data.settings.voiceReward} 元`,
        inline: true,
      },
      {
        name: "💵 每小時發放",
        value: `${totalUsers * coffeeShop.data.settings.voiceReward * 60} 元`,
        inline: true,
      }
    )
    .setTimestamp();

  if (channelStats.length > 0) {
    let channelDetails = "";
    channelStats.forEach((stat) => {
      channelDetails += `🎙️ **${stat.name}**: ${stat.count} 人 (${stat.reward}元/分鐘)\n`;
    });

    embed.addFields({
      name: "📊 各頻道詳情",
      value: channelDetails.slice(0, 1024),
      inline: false,
    });
  } else {
    embed.addFields({
      name: "📊 頻道狀態",
      value: "目前沒有人在語音頻道中",
      inline: false,
    });
  }

  await interaction.reply(createEphemeralReply("", embed));
}

// 處理自動完成
async function handleAutocomplete(interaction) {
  const focusedOption = interaction.options.getFocused(true);

  if (focusedOption.name === "商品") {
    const value = focusedOption.value.toLowerCase();
    const choices = coffeeShop.data.menu
      .filter((item) => item.name.toLowerCase().includes(value))
      .slice(0, 25) // Discord 限制最多 25 個選項
      .map((item) => ({
        name: `${item.emoji} ${item.name} - ${item.price}元`,
        value: item.name,
      }));

    await interaction.respond(choices);
  } else if (focusedOption.name === "獎勵") {
    const value = focusedOption.value.toLowerCase();
    const choices = coffeeShop.data.rewardShop
      .filter((reward) => reward.name.toLowerCase().includes(value))
      .slice(0, 25)
      .map((reward) => ({
        name: `${reward.emoji} ${reward.name} - ${reward.cost}點`,
        value: reward.id,
      }));

    await interaction.respond(choices);
  }
}

// 請客指令
async function handleTreatCommand(interaction) {
  const friend = interaction.options.getUser("朋友");
  const itemName = interaction.options.getString("商品");
  const message = interaction.options.getString("留言") || "";

  // 不能請自己
  if (friend.id === interaction.user.id) {
    return await interaction.reply(
      createEphemeralReply("❌ 不能請自己喝飲料哦！")
    );
  }

  // 不能請機器人
  if (friend.bot) {
    return await interaction.reply(
      createEphemeralReply("❌ 機器人不需要喝飲料呢～")
    );
  }

  // 尋找商品
  const item = coffeeShop.data.menu.find((i) => i.name === itemName);
  if (!item) {
    return await interaction.reply(
      createEphemeralReply(
        `❌ 找不到商品「${itemName}」！請使用 \`/菜單\` 查看可用商品。`
      )
    );
  }

  // 檢查請客者金額
  const buyerData = coffeeShop.initUser(interaction.user.id);
  if (buyerData.money < item.price) {
    return await interaction.reply(
      createEphemeralReply(
        `❌ 金額不足！你需要 ${item.price} 元，但只有 ${buyerData.money} 元。`
      )
    );
  }

  // 執行請客交易
  const friendData = coffeeShop.initUser(friend.id);

  // 扣除請客者金額
  buyerData.money -= item.price;
  buyerData.totalSpent += item.price;
  buyerData.purchaseHistory.push({
    item: `請客: ${item.name} (給 ${friend.displayName})`,
    price: item.price,
    time: Date.now(),
  });

  // 朋友獲得集點但不扣錢
  friendData.points += coffeeShop.data.settings.pointsPerPurchase;
  friendData.purchaseHistory.push({
    item: `被請客: ${item.name} (來自 ${interaction.user.displayName})`,
    price: 0,
    time: Date.now(),
  });

  // 更新咖啡廳帳戶和統計
  coffeeShop.data.shopAccount += item.price;
  coffeeShop.updateDailyStats(friend.id, item.price);

  coffeeShop.saveData();

  // 創建請客成功的訊息
  const embed = new EmbedBuilder()
    .setTitle("🎁 請客成功！")
    .setDescription(
      `**${interaction.user.displayName}** 請 **${friend.displayName}** 了一份 ${item.emoji} **${item.name}**！`
    )
    .setColor("#FFD700")
    .addFields({
      name: "🎁 請客商品",
      value: `${item.emoji} ${item.name}`,
      inline: true,
    });

  if (message) {
    embed.addFields({
      name: "💌 留言",
      value: message,
      inline: false,
    });
  }

  embed.addFields({
    name: "⭐ 朋友獲得",
    value: `${item.emoji} ${item.name} + ${coffeeShop.data.settings.pointsPerPurchase} 集點`,
    inline: false,
  });

  embed.setTimestamp().setFooter({ text: "友誼萬歲！感謝你的慷慨～" });

  // 發送公開訊息
  await interaction.reply({ embeds: [embed] });

  // 延遲發送額外的慶祝訊息
  setTimeout(async () => {
    try {
      const celebrationMessages = [
        `🎉 太棒了！${friend.displayName} 被請客了！`,
        `🥳 ${interaction.user.displayName} 真是太大方了！`,
        `☕ 友誼的味道最香甜了～`,
        `🎁 這就是友誼的力量！`,
        `💕 溫暖的請客時光～`,
        `☕ 一起享受美好時光～`,
        `🍰 甜蜜的友誼時刻！`,
      ];

      const randomMessage =
        celebrationMessages[
          Math.floor(Math.random() * celebrationMessages.length)
        ];
      await interaction.followUp(randomMessage);
    } catch (error) {
      console.log("發送慶祝訊息失敗:", error);
    }
  }, 2000);

  console.log(
    `🎁 請客成功: ${interaction.user.tag} 請 ${friend.tag} 喝了 ${item.name}`
  );
}

// 錢包指令
async function handleWalletCommand(interaction) {
  const targetUser = interaction.options.getUser("玩家");

  if (
    targetUser &&
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply({
      content: "❌ 只有店長和管理員可以查看其他人的錢包！",
      ephemeral: true,
    });
  }

  const userId = targetUser ? targetUser.id : interaction.user.id;
  const displayName = targetUser
    ? targetUser.displayName
    : interaction.user.displayName;

  const userData = coffeeShop.initUser(userId);

  const embed = new EmbedBuilder()
    .setTitle(`💰 ${displayName} 的錢包`)
    .setColor("#FFD700")
    .addFields(
      { name: "💵 目前金額", value: `${userData.money} 元`, inline: true },
      { name: "⭐ 集點數", value: `${userData.points} 點`, inline: true },
      { name: "📈 總收入", value: `${userData.totalEarned} 元`, inline: true },
      { name: "📉 總支出", value: `${userData.totalSpent} 元`, inline: true },
      {
        name: "🛒 購買次數",
        value: `${userData.purchaseHistory.length} 次`,
        inline: true,
      },
      {
        name: "🎯 兌換進度",
        value: `${userData.points}/${coffeeShop.data.settings.pointsToReward}`,
        inline: true,
      }
    )
    .setTimestamp();
  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

// 簽到指令
async function handleDailyCommand(interaction) {
  const result = coffeeShop.checkDailyReward(interaction.user.id);

  if (!result.success) {
    return await interaction.reply(
      createEphemeralReply(`❌ ${result.message}`)
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("✅ 簽到成功！")
    .setDescription(`獲得 ${result.reward} 元獎勵！`)
    .setColor("#00FF00")
    .addFields({ name: "💰 目前金額", value: `${result.newBalance} 元` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// 菜單指令
async function handleMenuCommand(interaction) {
  if (coffeeShop.data.menu.length === 0) {
    return await interaction.reply(
      createEphemeralReply(
        "☕ 菜單目前是空的！請店長使用 `/快速設定菜單` 來建立菜單。"
      )
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("☕ 咖啡廳菜單")
    .setColor("#8B4513")
    .setDescription("歡迎來到燒肉Cafe！")
    .setTimestamp();

  coffeeShop.data.menu.forEach((item) => {
    embed.addFields({
      name: `${item.emoji || "☕"} ${item.name}`,
      value: `💰 ${item.price} 元`,
      inline: true,
    });
  });

  await interaction.reply({ embeds: [embed] });
}

// 集點商店指令
async function handleRewardShopCommand(interaction) {
  const userData = coffeeShop.initUser(interaction.user.id);

  const embed = new EmbedBuilder()
    .setTitle("🎁 集點兌換商店")
    .setDescription(`你目前有 **${userData.points}** 點集點`)
    .setColor("#FF69B4")
    .setTimestamp()
    .setFooter({ text: "使用 /集點兌換 來兌換獎勵！" });

  // 按成本排序並添加獎勵
  const sortedRewards = [...coffeeShop.data.rewardShop].sort(
    (a, b) => a.cost - b.cost
  );

  sortedRewards.forEach((reward) => {
    const canAfford = userData.points >= reward.cost ? "✅" : "❌";
    embed.addFields({
      name: `${canAfford} ${reward.emoji} ${reward.name}`,
      value: `💎 ${reward.cost} 點\n📝 ${reward.description}`,
      inline: true,
    });
  });

  await interaction.reply({ embeds: [embed] });
}

// 修复后的集点兑换指令
async function handleRedeemPointsCommand(interaction) {
  const rewardId = interaction.options.getString("獎勵");
  const userId = interaction.user.id;

  const userData = coffeeShop.initUser(userId);
  const reward = coffeeShop.data.rewardShop.find((r) => r.id === rewardId);

  if (!reward) {
    return await interaction.reply(
      createEphemeralReply("❌ 找不到該獎勵項目！")
    );
  }

  if (userData.points < reward.cost) {
    return await interaction.reply(
      createEphemeralReply(
        `❌ 集點不足！需要 ${reward.cost} 點，目前有 ${userData.points} 點`
      )
    );
  }

  // 扣除集點
  userData.points -= reward.cost;

  // 根據獎勵類型給予不同獎勵
  let rewardResult = "";

  switch (reward.type) {
    case "money":
      userData.money += reward.value;
      userData.totalEarned += reward.value;
      rewardResult = `獲得 ${reward.value} 元現金！`;
      break;

    case "item":
      if (reward.value === "random_drink") {
        // 隨機給一杯飲料
        const randomDrink =
          coffeeShop.data.menu[
            Math.floor(Math.random() * coffeeShop.data.menu.length)
          ];
        if (randomDrink) {
          userData.purchaseHistory.push({
            item: `免費飲料券: ${randomDrink.name}`,
            price: 0,
            time: Date.now(),
          });
          rewardResult = `獲得一杯免費的 ${randomDrink.emoji} ${randomDrink.name}！`;
        } else {
          rewardResult = "獲得免費飲料券！";
        }
      }
      break;

    case "buff":
      if (reward.value === "double_points") {
        // 設置雙倍集點標記（你可以根據需要實現）
        userData.doublePointsNext = true;
        rewardResult = "獲得雙倍集點卡！下次購買將獲得雙倍集點！";
      }
      break;

    case "title":
      // 給予稱號（你可以根據需要實現）
      userData.title = reward.value;
      rewardResult = `獲得稱號：${reward.value}！`;
      break;

    case "lucky":
      // 幸運寶箱隨機金額
      const [min, max] = reward.value;
      const luckyAmount = Math.floor(Math.random() * (max - min + 1)) + min;
      userData.money += luckyAmount;
      userData.totalEarned += luckyAmount;
      rewardResult = `幸運寶箱開出 ${luckyAmount} 元！`;
      break;

    default:
      rewardResult = `獲得 ${reward.name}！`;
  }

  coffeeShop.saveData();

  const embed = new EmbedBuilder()
    .setTitle("🎉 兌換成功！")
    .setDescription(`${reward.emoji} **${reward.name}**\n${rewardResult}`)
    .setColor("#00FF00")
    .addFields(
      { name: "💎 消耗集點", value: `${reward.cost} 點`, inline: true },
      { name: "⭐ 剩餘集點", value: `${userData.points} 點`, inline: true },
      { name: "💰 目前金額", value: `${userData.money} 元`, inline: true }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// 退款指令
async function handleRefundCommand(interaction) {
  const targetUser = interaction.options.getUser("玩家");
  const userId = targetUser ? targetUser.id : interaction.user.id;
  const displayName = targetUser
    ? targetUser.displayName
    : interaction.user.displayName;

  if (
    targetUser &&
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店長和管理員可以為他人退款！")
    );
  }

  const userData = coffeeShop.initUser(userId);

  if (!userData.purchaseHistory || userData.purchaseHistory.length === 0) {
    return await interaction.reply(
      createEphemeralReply("❌ 沒有找到購買記錄！")
    );
  }

  const lastPurchase =
    userData.purchaseHistory[userData.purchaseHistory.length - 1];
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  if (lastPurchase.time < fiveMinutesAgo) {
    return await interaction.reply(
      createEphemeralReply("❌ 只能退款5分鐘內的購買！")
    );
  }

  userData.money += lastPurchase.price;
  userData.totalSpent -= lastPurchase.price;
  userData.points = Math.max(
    0,
    userData.points - coffeeShop.data.settings.pointsPerPurchase
  );
  coffeeShop.data.shopAccount -= lastPurchase.price;

  userData.purchaseHistory.pop();
  coffeeShop.saveData();

  const embed = new EmbedBuilder()
    .setTitle("✅ 退款成功！")
    .setDescription(`已為 **${displayName}** 退款`)
    .setColor("#00FF00")
    .addFields(
      { name: "📦 退款項目", value: lastPurchase.item, inline: true },
      { name: "💰 退款金額", value: `${lastPurchase.price} 元`, inline: true },
      { name: "💵 目前金額", value: `${userData.money} 元`, inline: true }
    )
    .setTimestamp();

  await interaction.reply(createEphemeralReply("", embed));
}

// 发布菜单指令（仅店长）- 分页版本
async function handlePublishMenuCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店长和管理员可以发布菜单！")
    );
  }

  if (!coffeeShop.data.settings.menuChannelId) {
    return await interaction.reply(
      createEphemeralReply(
        "❌ 请先设定菜单发布频道！使用 `/设定 菜单频道 #频道名称`"
      )
    );
  }

  if (coffeeShop.data.menu.length === 0) {
    return await interaction.reply(
      createEphemeralReply(
        "❌ 菜单是空的！请先使用 `/快速设定菜单` 或 `/编辑菜单 新增` 来建立菜单项目。"
      )
    );
  }

  try {
    const channel = interaction.guild.channels.cache.get(
      coffeeShop.data.settings.menuChannelId
    );

    if (!channel) {
      return await interaction.reply(
        createEphemeralReply("❌ 找不到菜单频道！请重新设定菜单频道。")
      );
    }

    // 检查机器人权限
    const botPermissions = channel.permissionsFor(interaction.guild.members.me);
    if (
      !botPermissions.has(["SendMessages", "EmbedLinks", "UseExternalEmojis"])
    ) {
      return await interaction.reply(
        createEphemeralReply(
          "❌ 机器人在目标频道没有足够权限！需要：发送讯息、嵌入连结、使用外部表情符号"
        )
      );
    }

    // 发送分页菜单（从第一页开始）
    const sentMessage = await sendPaginatedMenu(channel, 0);

    console.log(
      `✅ 分页菜单已发布到频道 ${channel.name}，讯息ID: ${sentMessage.id}`
    );

    // 回复成功讯息
    await interaction.reply(
      createEphemeralReply(
        `✅ 分页菜单已成功发布到 ${channel}！\n📊 包含 ${coffeeShop.data.menu.length} 个项目，支持分页浏览`
      )
    );
  } catch (error) {
    console.error("❌ 发布菜单时发生错误:", error);
    await interaction.reply(createEphemeralReply("❌ 发布菜单时发生错误！"));
  }
}

// 編輯菜單指令（僅店長）
async function handleEditMenuCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店長和管理員可以編輯菜單！")
    );
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "新增":
      const id = interaction.options.getString("id").toLowerCase().trim();
      const name = interaction.options.getString("名稱");
      const price = interaction.options.getInteger("價格");
      const emoji = interaction.options.getString("表情符號") || "☕";

      if (price <= 0) {
        return await interaction.reply(
          createEphemeralReply("❌ 價格必須大於0！")
        );
      }

      if (coffeeShop.data.menu.find((item) => item.id === id)) {
        return await interaction.reply(
          createEphemeralReply("❌ 此ID已存在！請使用不同的ID。")
        );
      }

      const newItem = { id, name, price, emoji, image: emoji };
      coffeeShop.data.menu.push(newItem);
      coffeeShop.saveData();

      console.log(`➕ 新增菜單項目:`, newItem);
      console.log(`📋 目前菜單項目數量: ${coffeeShop.data.menu.length}`);

      const addEmbed = new EmbedBuilder()
        .setTitle("✅ 菜單項目新增成功！")
        .setColor("#00FF00")
        .addFields(
          { name: "🆔 項目ID", value: id, inline: true },
          { name: "📝 項目名稱", value: name, inline: true },
          { name: "💰 價格", value: `${price} 元`, inline: true },
          { name: "😀 表情符號", value: emoji, inline: true },
          {
            name: "📊 總菜單項目",
            value: `${coffeeShop.data.menu.length} 個`,
            inline: true,
          }
        )
        .setTimestamp()
        .setFooter({ text: "記得使用 /發布菜單 來更新頻道中的菜單！" });

      await interaction.reply({ embeds: [addEmbed] });
      break;

    case "刪除":
      const itemToDelete = interaction.options.getString("id");
      const index = coffeeShop.data.menu.findIndex(
        (item) => item.id === itemToDelete
      );

      if (index === -1) {
        return await interaction.reply(
          createEphemeralReply("❌ 找不到這個菜單項目！")
        );
      }

      const deletedItem = coffeeShop.data.menu[index];
      coffeeShop.data.menu.splice(index, 1);
      coffeeShop.saveData();
      await interaction.reply(`✅ 已刪除菜單項目: ${deletedItem.name}`);
      break;
  }
}

// 營收報告指令（僅店長）
async function handleRevenueReportCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店長和管理員可以查看營收報告！")
    );
  }

  try {
    const today = new Date().toDateString();
    let todaySales = 0;
    let todayCustomers = 0;

    // 修復 Set/Array 相容性問題
    if (coffeeShop.data.dailyStats.date === today) {
      todaySales = coffeeShop.data.dailyStats.sales || 0;

      // 安全處理 customers 數據
      if (coffeeShop.data.dailyStats.customers) {
        if (Array.isArray(coffeeShop.data.dailyStats.customers)) {
          todayCustomers = coffeeShop.data.dailyStats.customers.length;
        } else if (coffeeShop.data.dailyStats.customers instanceof Set) {
          todayCustomers = coffeeShop.data.dailyStats.customers.size;
        } else {
          console.log("⚠️ customers 數據格式異常，重置為空 Set");
          coffeeShop.data.dailyStats.customers = new Set();
          todayCustomers = 0;
        }
      } else {
        coffeeShop.data.dailyStats.customers = new Set();
        todayCustomers = 0;
      }
    }

    const totalUsers = Object.keys(coffeeShop.data.users || {}).length;
    const activeUsers = Object.values(coffeeShop.data.users || {}).filter(
      (user) => user.purchaseHistory && user.purchaseHistory.length > 0
    ).length;

    // 安全處理購買統計
    const itemStats = {};
    Object.values(coffeeShop.data.users || {}).forEach((user) => {
      if (user.purchaseHistory && Array.isArray(user.purchaseHistory)) {
        user.purchaseHistory.forEach((purchase) => {
          if (purchase && purchase.item) {
            itemStats[purchase.item] = (itemStats[purchase.item] || 0) + 1;
          }
        });
      }
    });

    const popularItem =
      Object.entries(itemStats).length > 0
        ? Object.entries(itemStats).sort((a, b) => b[1] - a[1])[0]
        : null;

    const embed = new EmbedBuilder()
      .setTitle("📊 燒肉Cafe 營收報告")
      .setColor("#FFD700")
      .addFields(
        {
          name: "🏪 咖啡廳戶頭",
          value: `${coffeeShop.data.shopAccount || 0} 元`,
          inline: true,
        },
        { name: "📅 今日營收", value: `${todaySales} 元`, inline: true },
        { name: "👥 今日顧客", value: `${todayCustomers} 人`, inline: true },
        { name: "👤 總註冊用戶", value: `${totalUsers} 人`, inline: true },
        { name: "🛒 活躍顧客", value: `${activeUsers} 人`, inline: true },
        {
          name: "⭐ 熱門商品",
          value: popularItem ? `${popularItem[0]} (${popularItem[1]}次)` : "無",
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: `報告日期: ${today}` });

    await interaction.reply(createEphemeralReply("", embed));
  } catch (error) {
    console.error("❌ 營收報告錯誤:", error);
    await interaction.reply(
      createEphemeralReply("❌ 生成營收報告時發生錯誤！請聯繫管理員。")
    );
  }
}

// 發薪水指令（僅店長）
async function handlePaySalaryCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店長和管理員可以發薪水！")
    );
  }

  const targetUser = interaction.options.getUser("玩家");
  const amount = interaction.options.getInteger("金額");

  if (amount <= 0) {
    return await interaction.reply(
      createEphemeralReply("❌ 薪水金額必須大於0！")
    );
  }

  if (coffeeShop.data.shopAccount < amount) {
    return await interaction.reply(
      createEphemeralReply("❌ 咖啡廳戶頭餘額不足！")
    );
  }

  coffeeShop.addMoney(targetUser.id, amount, "薪水發放");
  coffeeShop.data.shopAccount -= amount;
  coffeeShop.saveData();

  const embed = new EmbedBuilder()
    .setTitle("💰 薪水發放成功！")
    .setDescription(`已給 ${targetUser} 發放薪水 ${amount} 元`)
    .setColor("#00FF00")
    .addFields(
      { name: "💵 發放金額", value: `${amount} 元`, inline: true },
      {
        name: "🏪 咖啡廳剩餘",
        value: `${coffeeShop.data.shopAccount} 元`,
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// 快速設定菜單指令
async function handleQuickSetupMenuCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店長和管理員可以快速設定菜單！")
    );
  }

  const defaultMenu = [
    { id: "americano", name: "美式咖啡", price: 50, emoji: "☕" },
    { id: "latte", name: "拿鐵咖啡", price: 80, emoji: "🥛" },
    { id: "cappuccino", name: "卡布奇諾", price: 85, emoji: "☕" },
    { id: "mocha", name: "摩卡咖啡", price: 90, emoji: "☕" },
    { id: "tiramisu", name: "提拉米蘇", price: 120, emoji: "🍰" },
    { id: "cheesecake", name: "起司蛋糕", price: 100, emoji: "🧀" },
    { id: "brownie", name: "布朗尼", price: 80, emoji: "🍫" },
    { id: "croissant", name: "可頌", price: 60, emoji: "🥐" },
  ];

  let addedCount = 0;
  let skippedCount = 0;
  let addedItems = [];

  for (const item of defaultMenu) {
    if (coffeeShop.data.menu.find((existing) => existing.id === item.id)) {
      skippedCount++;
      continue;
    }

    const newItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      emoji: item.emoji,
      image: item.emoji,
    };

    coffeeShop.data.menu.push(newItem);
    addedItems.push(newItem);
    addedCount++;
  }

  coffeeShop.saveData();

  const embed = new EmbedBuilder()
    .setTitle("🚀 快速設定菜單完成！")
    .setColor("#00FF00")
    .addFields(
      { name: "✅ 新增項目", value: `${addedCount} 個`, inline: true },
      {
        name: "⚠️ 跳過項目",
        value: `${skippedCount} 個 (已存在)`,
        inline: true,
      },
      {
        name: "📊 總菜單項目",
        value: `${coffeeShop.data.menu.length} 個`,
        inline: true,
      }
    );

  if (addedItems.length > 0) {
    let itemList = "";
    addedItems.forEach((item) => {
      itemList += `${item.emoji} ${item.name} - ${item.price}元\n`;
    });
    embed.addFields({
      name: "🆕 新增的項目",
      value: itemList.slice(0, 1024),
      inline: false,
    });
  }

  embed.setFooter({ text: "記得使用 /發布菜單 來更新頻道中的菜單！" });

  await interaction.reply({ embeds: [embed] });
}

// 除錯菜單指令
async function handleDebugMenuCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有店長和管理員可以使用除錯功能！")
    );
  }

  const embed = new EmbedBuilder()
    .setTitle("🔍 菜單除錯資訊")
    .setColor("#FFA500")
    .addFields(
      {
        name: "📊 菜單項目數量",
        value: `${coffeeShop.data.menu.length} 個`,
        inline: true,
      },
      {
        name: "🏪 咖啡廳戶頭",
        value: `${coffeeShop.data.shopAccount} 元`,
        inline: true,
      },
      {
        name: "📺 菜單頻道",
        value: coffeeShop.data.settings.menuChannelId || "未設定",
        inline: true,
      }
    );

  // 檢查菜單頻道是否有效
  if (coffeeShop.data.settings.menuChannelId) {
    const menuChannel = interaction.guild.channels.cache.get(
      coffeeShop.data.settings.menuChannelId
    );

    if (menuChannel) {
      const botPermissions = menuChannel.permissionsFor(
        interaction.guild.members.me
      );
      const hasRequiredPerms = botPermissions.has([
        "SendMessages",
        "EmbedLinks",
        "UseExternalEmojis",
      ]);

      embed.addFields({
        name: "🔑 頻道權限檢查",
        value: hasRequiredPerms ? "✅ 權限正常" : "❌ 權限不足",
        inline: true,
      });
    } else {
      embed.addFields({
        name: "🔑 頻道狀態",
        value: "❌ 找不到設定的頻道",
        inline: true,
      });
    }
  }

  // 詳細檢查每個菜單項目
  if (coffeeShop.data.menu.length > 0) {
    let menuDetails = "";
    let validItems = 0;
    let invalidItems = 0;

    coffeeShop.data.menu.forEach((item, index) => {
      const isValid =
        item.id &&
        item.name &&
        typeof item.price === "number" &&
        item.price > 0;

      if (isValid) {
        validItems++;
      } else {
        invalidItems++;
      }

      const status = isValid ? "✅" : "❌";
      menuDetails += `${status} ${index + 1}. **${
        item.name || "無名稱"
      }** (ID: \`${item.id || "無ID"}\`)\n`;
      menuDetails += `   ${item.emoji || "☕"} ${item.price || "無價格"}元\n`;

      if (!isValid) {
        menuDetails += `   ⚠️ 問題: ${!item.id ? "缺少ID " : ""}${
          !item.name ? "缺少名稱 " : ""
        }${
          typeof item.price !== "number" || item.price <= 0 ? "價格無效" : ""
        }\n`;
      }
      menuDetails += "\n";
    });

    embed.addFields(
      {
        name: "📊 項目狀態統計",
        value: `✅ 有效: ${validItems} 個\n❌ 無效: ${invalidItems} 個`,
        inline: true,
      },
      {
        name: "📋 菜單詳細資料",
        value: menuDetails.slice(0, 1024),
        inline: false,
      }
    );

    // 預測按鈕創建情況
    const maxButtons = 10; // 5行 x 2個按鈕
    const buttonCount = Math.min(validItems, maxButtons);
    embed.addFields({
      name: "🔘 按鈕預測",
      value: `預計可創建 ${buttonCount} 個按鈕 (最多 ${maxButtons} 個)`,
      inline: true,
    });
  } else {
    embed.addFields({
      name: "📋 菜單狀態",
      value: "❌ 目前沒有任何菜單項目\n建議使用 `/快速設定菜單` 創建預設菜單",
      inline: false,
    });
  }

  // 檢查資料檔案
  try {
    const stats = fs.statSync(coffeeShop.dataPath);
    embed.addFields({
      name: "💾 資料檔案",
      value: `檔案大小: ${(stats.size / 1024).toFixed(
        2
      )} KB\n最後修改: ${stats.mtime.toLocaleString("zh-TW")}`,
      inline: false,
    });
  } catch (error) {
    embed.addFields({
      name: "💾 資料檔案",
      value: "❌ 無法讀取檔案資訊",
      inline: false,
    });
  }

  // 添加建議操作
  let suggestions = [];

  if (coffeeShop.data.menu.length === 0) {
    suggestions.push("• 使用 `/快速設定菜單` 創建預設菜單項目");
  }

  if (!coffeeShop.data.settings.menuChannelId) {
    suggestions.push("• 使用 `/設定 菜單頻道 #頻道名稱` 設定發布頻道");
  }

  if (invalidItems > 0) {
    suggestions.push("• 檢查並修復無效的菜單項目");
  }

  if (validItems > 0 && coffeeShop.data.settings.menuChannelId) {
    suggestions.push("• 使用 `/發布菜單` 重新發布互動式菜單");
  }

  if (suggestions.length > 0) {
    embed.addFields({
      name: "💡 建議操作",
      value: suggestions.join("\n"),
      inline: false,
    });
  }

  await interaction.reply(createEphemeralReply("", embed));
}

// 設定指令（僅管理員）
async function handleSettingsCommand(interaction) {
  if (!coffeeShop.isAdmin(interaction.member)) {
    return await interaction.reply(
      createEphemeralReply("❌ 只有管理員可以使用設定功能！")
    );
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "店長身分組":
      const managerRole = interaction.options.getRole("身分組");
      coffeeShop.data.settings.managerRoleId = managerRole.id;
      coffeeShop.saveData();
      await interaction.reply(`✅ 店長身分組已設定為 ${managerRole}`);
      break;

    case "菜單頻道":
      const menuChannel = interaction.options.getChannel("頻道");
      coffeeShop.data.settings.menuChannelId = menuChannel.id;
      coffeeShop.saveData();
      await interaction.reply(`✅ 菜單發布頻道已設定為 ${menuChannel}`);
      break;
  }
}

// 修改 handleButtonInteraction 函数，添加分页处理
async function handleButtonInteraction(interaction) {
  console.log(
    `🔘 按鈕點擊: ${interaction.customId} 由 ${interaction.user.tag}`
  );

  // 处理分页按钮
  if (
    interaction.customId.startsWith("menu_prev_") ||
    interaction.customId.startsWith("menu_next_")
  ) {
    await handleMenuNavigation(interaction);
    return;
  }

  // 处理购买按钮
  if (!interaction.customId.startsWith("buy_")) {
    console.log(`❌ 無效的按鈕ID: ${interaction.customId}`);
    return;
  }

  try {
    // 立即回应互动，避免超时
    await interaction.deferReply({ flags: [4096] });

    const itemId = interaction.customId.replace("buy_", "");
    console.log(`🛒 嘗試購買項目: ${itemId}`);

    // 检查项目是否存在
    const item = coffeeShop.data.menu.find((i) => i.id === itemId);
    if (!item) {
      console.log(`❌ 找不到項目: ${itemId}`);
      return await interaction.editReply({
        content: `❌ 找不到商品！項目ID: ${itemId}`,
      });
    }

    const result = coffeeShop.purchaseItem(interaction.user.id, itemId);

    if (!result.success) {
      return await interaction.editReply({
        content: `❌ ${result.message}`,
      });
    }

    // 随机感谢语句
    const thankMessages = [
      `恭喜！你得到了一份新鮮製作的`,
      `太棒了！為你精心準備的`,
      `完成了！你的專屬`,
      `製作完成！熱騰騰的`,
      `好了！香噴噴的`,
      `準備完畢！美味的`,
    ];

    const randomMessage =
      thankMessages[Math.floor(Math.random() * thankMessages.length)];

    // 创建购买成功的回应
    const embed = new EmbedBuilder()
      .setTitle("🎉 購買成功！")
      .setDescription(
        `${randomMessage} **${result.item.name}** ${result.item.emoji}\n\n請慢用～`
      )
      .setColor("#00FF00")
      .addFields(
        { name: "💰 花費", value: `${result.item.price} 元`, inline: true },
        { name: "💵 剩餘金額", value: `${result.newBalance} 元`, inline: true },
        {
          name: "⭐ 獲得集點",
          value: `+${coffeeShop.data.settings.pointsPerPurchase} 點`,
          inline: true,
        },
        { name: "🎯 目前集點", value: `${result.points} 點`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: "感謝你的惠顧！" });

    // 如果集点达到兑换标准，提醒用户
    if (result.points >= coffeeShop.data.settings.pointsToReward) {
      embed.addFields({
        name: "🎁 集點提醒",
        value: `你已經有 ${result.points} 點了！可以使用 \`/集點兌換\` 指令兌換獎勵！`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [embed] });

    // 延迟发送公开消息
    setTimeout(async () => {
      try {
        const channel = interaction.channel;
        if (channel) {
          const publicMessage = `🎉 **${interaction.user.displayName}** 獲得了一份 ${result.item.emoji} **${result.item.name}**！`;
          await channel.send(publicMessage);
        }
      } catch (error) {
        console.log("發送公開訊息失敗:", error);
      }
    }, 1500);

    console.log(
      `✅ 購買成功: ${interaction.user.tag} 買了 ${result.item.name}`
    );
  } catch (error) {
    console.error("❌ 處理按鈕互動時發生錯誤:", error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({
          content:
            "❌ 處理購買時發生錯誤，請稍後再試！如果已扣款，請使用 `/退款` 指令。",
        });
      } else if (!interaction.replied) {
        await interaction.reply(
          createEphemeralReply("❌ 處理購買時發生錯誤，請稍後再試！")
        );
      }
    } catch (replyError) {
      console.error("❌ 無法回覆互動:", replyError);
    }
  }
}

// 新增：发送分页菜单函数
async function sendPaginatedMenu(channel, page = 0) {
  const itemsPerPage = 8; // 每页8个按钮（4行 x 2个）
  const totalItems = coffeeShop.data.menu.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // 确保页码在有效范围内
  page = Math.max(0, Math.min(page, totalPages - 1));

  const startIndex = page * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageItems = coffeeShop.data.menu.slice(startIndex, endIndex);

  // 创建菜单 Embed
  const embed = new EmbedBuilder()
    .setTitle("☕ 燒肉Cafe 菜單")
    .setColor("#8B4513")
    .setDescription(
      `點擊下方按鈕購買你喜歡的飲品和甜點！\n💰 購買後會立即扣款並獲得集點\n⭐ 每購買一次獲得 1 點，集滿 10 點可兌換獎勵\n\n📄 第 ${
        page + 1
      } 頁，共 ${totalPages} 頁`
    )
    .setTimestamp()
    .setFooter({ text: "營業時間：店長在線時 | 點擊按鈕即可購買" });

  // 在 embed 中显示当前页的菜单项目
  currentPageItems.forEach((item) => {
    embed.addFields({
      name: `${item.emoji || "☕"} ${item.name}`,
      value: `💰 ${item.price} 元`,
      inline: true,
    });
  });

  // 创建按钮行
  const rows = [];

  // 商品按钮（最多4行，每行2个）
  for (let i = 0; i < currentPageItems.length; i += 2) {
    const row = new ActionRowBuilder();

    for (let j = i; j < Math.min(i + 2, currentPageItems.length); j++) {
      const item = currentPageItems[j];

      const buttonLabel = `${item.emoji || "☕"} ${item.name} - ${
        item.price
      }元`;
      const truncatedLabel =
        buttonLabel.length > 80
          ? buttonLabel.substring(0, 77) + "..."
          : buttonLabel;

      const button = new ButtonBuilder()
        .setCustomId(`buy_${item.id}`)
        .setLabel(truncatedLabel)
        .setStyle(ButtonStyle.Primary);

      row.addComponents(button);
    }

    rows.push(row);
  }

  // 导航按钮行（如果有多页）
  if (totalPages > 1) {
    const navRow = new ActionRowBuilder();

    // 上一页按钮
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`menu_prev_${page}`)
        .setLabel("⬅️ 上一頁")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0)
    );

    // 页码显示按钮（不可点击）
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`menu_page_${page}`)
        .setLabel(`${page + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    // 下一页按钮
    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`menu_next_${page}`)
        .setLabel("下一頁 ➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === totalPages - 1)
    );

    rows.push(navRow);
  }

  return await channel.send({
    embeds: [embed],
    components: rows,
  });
}

// 新增：处理菜单分页导航
async function handleMenuNavigation(interaction) {
  try {
    const currentPageMatch = interaction.customId.match(/(\d+)$/);
    if (!currentPageMatch) {
      console.log("❌ 无法解析页码");
      await interaction.deferUpdate();
      return;
    }

    const currentPage = parseInt(currentPageMatch[1]);
    let newPage = currentPage;

    if (interaction.customId.startsWith("menu_prev_")) {
      newPage = Math.max(0, currentPage - 1);
      console.log(`📄 切換到上一頁: ${currentPage} → ${newPage}`);
    } else if (interaction.customId.startsWith("menu_next_")) {
      const itemsPerPage = 8;
      const totalPages = Math.ceil(coffeeShop.data.menu.length / itemsPerPage);
      newPage = Math.min(totalPages - 1, currentPage + 1);
      console.log(`📄 切換到下一頁: ${currentPage} → ${newPage}`);
    }

    // 如果页码没有变化，直接返回
    if (newPage === currentPage) {
      console.log(`📄 頁碼無變化，保持在第 ${currentPage + 1} 頁`);
      await interaction.deferUpdate();
      return;
    }

    // 更新消息内容
    const itemsPerPage = 8;
    const totalItems = coffeeShop.data.menu.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const startIndex = newPage * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentPageItems = coffeeShop.data.menu.slice(startIndex, endIndex);

    console.log(
      `📄 更新菜單頁面: 第 ${newPage + 1} 頁，顯示 ${
        currentPageItems.length
      } 個項目`
    );

    // 创建新的 embed
    const embed = new EmbedBuilder()
      .setTitle("☕ 燒肉Cafe 菜單")
      .setColor("#8B4513")
      .setDescription(
        `點擊下方按鈕購買你喜歡的飲品和甜點！\n💰 購買後會立即扣款並獲得集點\n⭐ 每購買一次獲得 1 點，集滿 10 點可兌換獎勵\n\n📄 第 ${
          newPage + 1
        } 頁，共 ${totalPages} 頁`
      )
      .setTimestamp()
      .setFooter({ text: "營業時間：店長在線時 | 點擊按鈕即可購買" });

    // 添加当前页的菜单项目
    currentPageItems.forEach((item) => {
      embed.addFields({
        name: `${item.emoji || "☕"} ${item.name}`,
        value: `💰 ${item.price} 元`,
        inline: true,
      });
    });

    // 创建新的按钮行
    const rows = [];

    // 商品按钮
    for (let i = 0; i < currentPageItems.length; i += 2) {
      const row = new ActionRowBuilder();

      for (let j = i; j < Math.min(i + 2, currentPageItems.length); j++) {
        const item = currentPageItems[j];

        const buttonLabel = `${item.emoji || "☕"} ${item.name} - ${
          item.price
        }元`;
        const truncatedLabel =
          buttonLabel.length > 80
            ? buttonLabel.substring(0, 77) + "..."
            : buttonLabel;

        const button = new ButtonBuilder()
          .setCustomId(`buy_${item.id}`)
          .setLabel(truncatedLabel)
          .setStyle(ButtonStyle.Primary);

        row.addComponents(button);
      }

      rows.push(row);
    }

    // 导航按钮行
    const navRow = new ActionRowBuilder();

    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`menu_prev_${newPage}`)
        .setLabel("⬅️ 上一頁")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(newPage === 0)
    );

    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`menu_page_${newPage}`)
        .setLabel(`${newPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    navRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`menu_next_${newPage}`)
        .setLabel("下一頁 ➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(newPage === totalPages - 1)
    );

    rows.push(navRow);

    // 更新消息
    await interaction.update({
      embeds: [embed],
      components: rows,
    });

    console.log(
      `✅ 菜單分頁成功: ${interaction.user.tag} 切換到第 ${newPage + 1} 頁`
    );
  } catch (error) {
    console.error("❌ 處理分頁導航時發生錯誤:", error);
    try {
      await interaction.deferUpdate();
    } catch (updateError) {
      console.error("❌ 無法更新互動:", updateError);
    }
  }
}

// 补充缺少的开启频道函数
async function lightningOpenChannel(channel) {
  if (currentState === "open") return;

  console.log(`⚡ 閃電開啟頻道...`);
  const startTime = Date.now();

  try {
    // 1. 設定所有人可以連接的權限
    const everyonePermPromise = channel.permissionOverwrites.edit(
      channel.guild.roles.everyone,
      {
        [PermissionFlagsBits.Connect]: true,
      }
    );

    // 2. 確保指定用戶有連接權限
    const userPermPromises = CONFIG.SPECIAL_USER_IDS.map(async (userId) => {
      try {
        await channel.permissionOverwrites.edit(userId.trim(), {
          [PermissionFlagsBits.Connect]: true,
        });
      } catch (err) {
        console.log(`設定用戶 ${userId} 權限失敗: ${err.message}`);
      }
    });

    // 3. 並行執行權限設定
    await Promise.allSettled([
      Promise.race([
        everyonePermPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("權限設定超時")), 5000)
        ),
      ]),
      ...userPermPromises,
    ]);

    console.log(`⚡ 權限設定完成 (${Date.now() - startTime}ms)`);

    // 4. 使用背景改名來避免阻塞
    ultraManager.backgroundRename(channel, CONFIG.OPEN_NAME);

    // 5. 更新狀態
    currentState = "open";
    console.log(`⚡ 頻道開啟完成 (總耗時: ${Date.now() - startTime}ms)`);
  } catch (error) {
    console.error(`❌ 開啟頻道失敗: ${error.message}`);
  }
}

// 閃電初始化 (保留原有功能)
async function initializeLightningFast() {
  try {
    const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);

    if (!channel || channel.type !== 2) {
      console.error("❌ 無效的語音頻道");
      return;
    }

    console.log(`⚡ 頻道初始化完成`);
  } catch (error) {
    console.error(`❌ 初始化頻道失敗: ${error.message}`);
  }
}

// 閃電關閉頻道 (保留原有功能)
async function lightningCloseChannel(channel) {
  if (currentState === "closed") return;

  console.log(`⚡ 閃電關閉頻道...`);
  const startTime = Date.now();

  try {
    const kickPromises = [];
    const membersToKick = channel.members.filter((member) => {
      if (CONFIG.SPECIAL_USER_IDS.includes(member.id)) return false;
      if (CONFIG.EXCLUDED_USER_IDS.includes(member.id)) return false;
      return true;
    });

    for (const [, member] of membersToKick) {
      kickPromises.push(
        member.voice
          .disconnect("頻道已打烊")
          .catch((err) => console.log(`踢出 ${member.displayName} 失敗`))
      );
    }

    const permPromise = channel.permissionOverwrites.edit(
      channel.guild.roles.everyone,
      {
        [PermissionFlagsBits.Connect]: false,
      }
    );

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

    ultraManager.backgroundRename(channel, CONFIG.CLOSED_NAME);

    currentState = "closed";
    console.log(`⚡ 頻道關閉完成 (總耗時: ${Date.now() - startTime}ms)`);
  } catch (error) {
    console.error(`❌ 關閉頻道失敗: ${error.message}`);
  }
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
⚡ 完整版燒肉Cafe機器人 ⚡

🚀 咖啡廳管理系統:
• 互動式菜單購買系統 ✅
• 分頁菜單支持 ✅
• 集點兌換獎勵機制 ✅
• 自動賺錢系統 (訊息 + 語音掛機) ✅
• 每日簽到獎勵 ✅
• 營收統計和管理 ✅
• 薪水發放系統 ✅
• 退款保護機制 ✅

🏪 店長專屬功能:
• 發布互動式分頁菜單 ✅
• 編輯菜單項目 (新增/刪除) ✅
• 查看營收報告 ✅
• 發放薪水給員工 ✅
• 查看所有玩家錢包 ✅
• 處理退款申請 ✅
• 快速設定預設菜單 ✅
• 除錯菜單狀態 ✅

💰 賺錢方式:
• 發送訊息: ${coffeeShop.data.settings.messageReward} 元/則
• 語音掛機: ${coffeeShop.data.settings.voiceReward} 元/分鐘
• 每日簽到: ${coffeeShop.data.settings.dailyReward} 元/天
• 集點兌換: 每 ${coffeeShop.data.settings.pointsToReward} 點兌換獎勵

⚡ 原有功能完全保留:
• 語音頻道自動開關 ✅
• 極速權限控制 ✅
• 智能改名系統 ✅
• 指定成員管理 ✅

🎮 完整指令列表:

👤 用戶指令:
- /錢包 - 查看錢包資訊和統計
- /簽到 - 每日簽到領獎勵
- /菜單 - 查看文字版菜單
- /集點商店 - 查看兌換商店🎁
- /集點兌換 - 兌換各種獎勵✨
- /退款 - 申請最近購買退款(5分鐘內)
- /請客 - 請朋友喝飲料💕

🏪 店長指令:
- /發布菜單 - 發布互動式分頁菜單
- /編輯菜單 新增/刪除 - 管理菜單項目
- /營收報告 - 查看經營數據和統計
- /發薪水 - 發放薪水給員工
- /快速設定菜單 - 一鍵建立8個預設項目
- /除錯菜單 - 檢查菜單和系統狀態
- /退款 玩家:@某人 - 為他人處理退款
- /語音統計 - 查看語音掛機統計

👑 管理員指令:
- /設定 店長身分組 - 設定店長權限
- /設定 菜單頻道 - 設定菜單發布頻道

✅ 清理完成內容:
• 移除同性戀指數測試功能 ✅
• 移除相關指令和處理函數 ✅
• 清理慶祝訊息中的相關內容 ✅
• 更新指令數量統計 (16 → 15) ✅
• 保持所有咖啡廳功能完整 ✅

🔧 設定步驟:
1. 設定環境變數 (.env 檔案)
2. npm install discord.js dotenv
3. node bot.js 啟動機器人
4. /設定 店長身分組 @店長角色
5. /設定 菜單頻道 #菜單頻道
6. /快速設定菜單 (建立預設菜單)
7. /發布菜單 (發布互動式分頁菜單)
8. 開始營業！

🎉 現在你的咖啡廳機器人更專注於經營功能！
`);
