// 時段測試工具
require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const CONFIG = {
  TOKEN: process.env.BOT_TOKEN,
  VOICE_CHANNEL_ID: process.env.VOICE_CHANNEL_ID,
};

// 測試改名性能
async function testRenamePerformance(channel, timeout = 30000) {
  const originalName = channel.name;
  const testName = originalName.endsWith(".")
    ? originalName.slice(0, -1)
    : originalName + ".";

  console.log(`\n🧪 測試改名性能 (${new Date().toLocaleTimeString()})`);
  console.log(`📝 "${originalName}" → "${testName}"`);

  const startTime = Date.now();

  try {
    await Promise.race([
      channel.setName(testName),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), timeout)
      ),
    ]);

    const duration = Date.now() - startTime;
    console.log(`✅ 改名成功！耗時: ${duration}ms`);

    // 立即改回原名
    const restoreStartTime = Date.now();
    await Promise.race([
      channel.setName(originalName),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), timeout)
      ),
    ]);

    const restoreDuration = Date.now() - restoreStartTime;
    console.log(`🔄 已恢復原名，耗時: ${restoreDuration}ms`);

    return {
      success: true,
      renameDuration: duration,
      restoreDuration: restoreDuration,
      totalDuration: duration + restoreDuration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error.code === 50028) {
      console.log(`🚫 速率限制！耗時: ${duration}ms`);
      return { success: false, type: "RATE_LIMITED", duration };
    } else if (error.message === "TIMEOUT") {
      console.log(`⏰ 超時！耗時: ${duration}ms`);
      return { success: false, type: "TIMEOUT", duration };
    } else {
      console.log(`❌ 錯誤: ${error.message}，耗時: ${duration}ms`);
      return { success: false, type: "ERROR", duration, error: error.message };
    }
  }
}

// 建議最佳時段
function suggestBestTimes() {
  console.log("\n⏰ Discord API 通常在以下時段性能較好:");
  console.log("📍 日本時間 (JST):");
  console.log("  🌅 早晨: 06:00-09:00 (亞洲用戶較少)");
  console.log("  🌆 傍晚: 18:00-20:00 (歐美剛起床)");
  console.log("  🌙 深夜: 23:00-02:00 (歐美用戶較少)");
  console.log("\n💡 避免的時段:");
  console.log("  ❌ 12:00-15:00 (亞洲高峰)");
  console.log("  ❌ 21:00-24:00 (全球高峰)");
}

// 定時測試
function scheduleTests(channel) {
  console.log("\n📊 開始定時測試（每30分鐘一次）...");
  console.log("💡 這將幫助找到最佳時段");
  console.log("⚠️ 按 Ctrl+C 停止測試\n");

  const results = [];
  let testCount = 0;

  const runTest = async () => {
    testCount++;
    console.log(`\n--- 第 ${testCount} 次測試 ---`);

    const result = await testRenamePerformance(channel, 15000);
    result.timestamp = new Date();
    result.hour = result.timestamp.getHours();
    results.push(result);

    // 分析結果
    if (results.length >= 3) {
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      console.log(`\n📈 當前統計:`);
      console.log(`✅ 成功: ${successful.length}/${results.length}`);
      console.log(`❌ 失敗: ${failed.length}/${results.length}`);

      if (successful.length > 0) {
        const avgDuration =
          successful.reduce((sum, r) => sum + r.totalDuration, 0) /
          successful.length;
        console.log(`⏱️ 平均耗時: ${Math.round(avgDuration)}ms`);

        const bestHours = successful.map((r) => r.hour);
        console.log(`🎯 成功時段: ${bestHours.join(", ")}時`);
      }
    }

    // 如果連續3次成功，建議使用
    const lastThree = results.slice(-3);
    if (lastThree.length === 3 && lastThree.every((r) => r.success)) {
      console.log(`\n🎉 連續3次成功！現在是使用改名功能的好時機`);
      console.log(`💡 建議立即切換到完整版本並測試`);
    }
  };

  // 立即執行第一次測試
  runTest();

  // 每30分鐘測試一次
  const interval = setInterval(runTest, 30 * 60 * 1000);

  // 6小時後自動停止
  setTimeout(() => {
    console.log("\n🛑 6小時測試完成");
    clearInterval(interval);

    if (results.length > 0) {
      const successful = results.filter((r) => r.success);
      if (successful.length > 0) {
        const bestHours = [...new Set(successful.map((r) => r.hour))].sort();
        console.log(`\n📊 總結報告:`);
        console.log(`🎯 最佳時段: ${bestHours.join(", ")}時`);
        console.log(`💡 建議在這些時段使用改名功能`);
      } else {
        console.log(`\n❌ 所有測試都失敗了`);
        console.log(`💡 建議使用純權限控制版本`);
      }
    }

    process.exit(0);
  }, 6 * 60 * 60 * 1000);

  return interval;
}

client.once("ready", async () => {
  console.log(`Bot已登入: ${client.user.tag}`);
  console.log(`開始時段性能測試...\n`);

  try {
    const channel = await client.channels.fetch(CONFIG.VOICE_CHANNEL_ID);
    console.log(`✅ 找到頻道: "${channel.name}"`);

    // 顯示當前時間
    const now = new Date();
    console.log(
      `🕐 當前時間: ${now.toLocaleString("zh-TW", {
        timeZone: "Asia/Tokyo",
      })} (JST)`
    );

    // 建議最佳時段
    suggestBestTimes();

    // 執行一次性測試
    console.log(`\n🔍 執行一次性測試...`);
    const result = await testRenamePerformance(channel, 20000);

    if (result.success) {
      console.log(`\n🎉 測試成功！API響應正常`);
      console.log(`💡 你現在可以使用完整的改名功能了`);
      process.exit(0);
    } else if (result.type === "RATE_LIMITED") {
      console.log(`\n🚫 確認速率限制，建議等待後再試`);
      process.exit(0);
    } else {
      console.log(`\n⚠️ API響應緩慢或不穩定`);
      console.log(`❓ 是否要開始定時測試找到最佳時段？`);
      console.log(`   - 將每30分鐘測試一次，持續6小時`);
      console.log(`   - 按 Ctrl+C 隨時停止\n`);

      // 5秒後開始定時測試
      setTimeout(() => {
        scheduleTests(channel);
      }, 5000);
    }
  } catch (error) {
    console.error("❌ 測試過程發生錯誤:", error);
    process.exit(1);
  }
});

// 優雅關閉
process.on("SIGINT", () => {
  console.log("\n\n🛑 測試已停止");
  console.log("💡 基於目前結果的建議:");
  console.log("   1. 嘗試在非高峰時段使用改名功能");
  console.log("   2. 或使用純權限控制版本");
  console.log("   3. 明天早上6-9點重新測試");
  process.exit(0);
});

client.login(CONFIG.TOKEN);
