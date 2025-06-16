// 深度診斷改名問題
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const CONFIG = {
  TOKEN: process.env.BOT_TOKEN,
  VOICE_CHANNEL_ID: process.env.VOICE_CHANNEL_ID,
};

// 測試不同名稱的改名速度
const testNames = [
  "test1", // 簡單英文
  "test測試", // 英文+中文
  "test☕", // 英文+emoji
  "☕測試", // emoji+中文
  "☕️燒肉Cafe：營業中", // 完整目標名稱
];

async function testRename(channel, name, timeout = 10000) {
  console.log(`\n🧪 測試改名: "${name}"`);
  const startTime = Date.now();

  try {
    await Promise.race([
      channel.setName(name),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), timeout)
      ),
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ 成功！耗時: ${duration}ms`);

    // 等待2秒讓Discord更新
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { success: true, duration, name };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (error.message === "TIMEOUT") {
      console.log(`❌ 超時！耗時: ${duration}ms`);
    } else if (error.code === 50028) {
      console.log(`🚫 速率限制！耗時: ${duration}ms`);
      return { success: false, duration, name, error: "RATE_LIMIT" };
    } else {
      console.log(`❌ 其他錯誤: ${error.message}，耗時: ${duration}ms`);
    }

    return { success: false, duration, name, error: error.message };
  }
}

client.once("ready", async () => {
  console.log(`Bot已登入: ${client.user.tag}`);
  console.log("開始深度診斷改名延遲問題...\n");

  try {
    const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);
    console.log(`✅ 找到頻道: "${channel.name}"`);

    const originalName = channel.name;
    const results = [];

    // 測試所有名稱
    for (let i = 0; i < testNames.length; i++) {
      const testName = testNames[i];

      // 如果遇到速率限制，停止測試
      if (
        results.length > 0 &&
        results[results.length - 1].error === "RATE_LIMIT"
      ) {
        console.log("\n🚫 遇到速率限制，停止測試");
        break;
      }

      const result = await testRename(channel, testName, 15000); // 15秒超時
      results.push(result);

      // 等待3秒再進行下一個測試
      if (i < testNames.length - 1) {
        console.log("⏰ 等待3秒...");
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    // 改回原名
    console.log(`\n🔄 改回原名: "${originalName}"`);
    await testRename(channel, originalName, 15000);

    // 分析結果
    console.log("\n📊 測試結果分析:");
    console.log("==================");

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log(`✅ 成功: ${successful.length}/${results.length}`);
    console.log(`❌ 失敗: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
      const avgDuration =
        successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
      console.log(`⏱️ 成功案例平均耗時: ${Math.round(avgDuration)}ms`);

      console.log("\n✅ 成功的名稱:");
      successful.forEach((r) =>
        console.log(`   - "${r.name}": ${r.duration}ms`)
      );
    }

    if (failed.length > 0) {
      console.log("\n❌ 失敗的名稱:");
      failed.forEach((r) =>
        console.log(`   - "${r.name}": ${r.error} (${r.duration}ms)`)
      );
    }

    // 給出建議
    console.log("\n💡 建議:");
    if (failed.length === results.length) {
      console.log("   - 所有測試都失敗，可能是速率限制或網路問題");
      console.log("   - 建議等待1小時後再測試");
    } else if (successful.some((r) => r.name.includes("☕️燒肉Cafe：營業中"))) {
      console.log("   - 目標名稱可以成功，問題可能是偶發的網路延遲");
      console.log("   - 建議增加重試機制");
    } else if (successful.some((r) => r.name === "test1")) {
      console.log("   - 簡單名稱可以成功，複雜名稱失敗");
      console.log("   - 建議簡化頻道名稱");
    }
  } catch (error) {
    console.error("❌ 診斷過程發生錯誤:", error);
  }

  process.exit(0);
});

client.login(CONFIG.TOKEN);
