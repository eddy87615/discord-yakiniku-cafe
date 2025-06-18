// 修復權限檢查函數，添加空值檢查
class CoffeeShopManager {
  // ... 其他代碼保持不變 ...

  isManager(member) {
    // 添加空值檢查
    if (!member || !member.roles || !member.roles.cache) {
      return false;
    }

    return (
      this.data.settings.managerRoleId &&
      member.roles.cache.has(this.data.settings.managerRoleId)
    );
  }

  isAdmin(member) {
    // 添加空值檢查
    if (!member || !member.permissions) {
      return false;
    }

    return member.permissions.has(PermissionFlagsBits.Administrator);
  }
}

// 修復所有指令處理函數，添加伺服器檢查
async function handleSlashCommand(interaction) {
  const { commandName } = interaction;

  try {
    // 檢查是否在伺服器中執行
    if (!interaction.guild) {
      return await interaction.reply({
        content: "❌ 此指令只能在伺服器中使用！",
        ephemeral: true,
      });
    }

    // 確保 member 存在
    if (!interaction.member) {
      return await interaction.reply({
        content: "❌ 無法獲取成員資訊，請稍後再試！",
        ephemeral: true,
      });
    }

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
      case "同性戀指數":
        await handleGayIndexCommand(interaction);
        break;
    }
  } catch (error) {
    console.error("處理指令時發生錯誤:", error);

    // 更詳細的錯誤處理
    let errorMessage = "處理指令時發生錯誤！";

    if (error.message.includes("Cannot read properties of null")) {
      errorMessage = "❌ 成員資訊讀取失敗，請確保在伺服器中使用此指令！";
    }

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: errorMessage,
        ephemeral: true,
      });
    }
  }
}

// 修復所有需要權限檢查的指令處理函數
async function handleRevenueReportCommand(interaction) {
  // 添加基本檢查
  if (!interaction.guild || !interaction.member) {
    return await interaction.reply({
      content: "❌ 此指令只能在伺服器中使用！",
      ephemeral: true,
    });
  }

  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply({
      content: "❌ 只有店長和管理員可以查看營收報告！",
      ephemeral: true,
    });
  }

  const today = new Date().toDateString();
  let todaySales = 0;
  let todayCustomers = 0;

  if (coffeeShop.data.dailyStats.date === today) {
    todaySales = coffeeShop.data.dailyStats.sales;
    todayCustomers = Array.isArray(coffeeShop.data.dailyStats.customers)
      ? coffeeShop.data.dailyStats.customers.length
      : coffeeShop.data.dailyStats.customers.size;
  }

  const totalUsers = Object.keys(coffeeShop.data.users).length;
  const activeUsers = Object.values(coffeeShop.data.users).filter(
    (user) => user.purchaseHistory && user.purchaseHistory.length > 0
  ).length;

  const itemStats = {};
  Object.values(coffeeShop.data.users).forEach((user) => {
    if (user.purchaseHistory) {
      user.purchaseHistory.forEach((purchase) => {
        itemStats[purchase.item] = (itemStats[purchase.item] || 0) + 1;
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
        value: `${coffeeShop.data.shopAccount} 元`,
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

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// 修復其他需要權限檢查的函數
async function handlePublishMenuCommand(interaction) {
  if (!interaction.guild || !interaction.member) {
    return await interaction.reply({
      content: "❌ 此指令只能在伺服器中使用！",
      ephemeral: true,
    });
  }

  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply({
      content: "❌ 只有店長和管理員可以發布菜單！",
      ephemeral: true,
    });
  }

  if (!coffeeShop.data.settings.menuChannelId) {
    return await interaction.reply({
      content: "❌ 請先設定菜單發布頻道！",
      ephemeral: true,
    });
  }

  if (coffeeShop.data.menu.length === 0) {
    return await interaction.reply({
      content:
        "❌ 菜單是空的！請先使用 `/快速設定菜單` 或 `/編輯菜單 新增` 來建立菜單項目。",
      ephemeral: true,
    });
  }

  const channel = interaction.guild.channels.cache.get(
    coffeeShop.data.settings.menuChannelId
  );
  if (!channel) {
    return await interaction.reply({
      content: "❌ 找不到菜單頻道！",
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle("☕ 燒肉Cafe 菜單")
    .setColor("#8B4513")
    .setDescription(
      "點擊下方按鈕購買你喜歡的飲品和甜點！\n💰 購買後會立即扣款並獲得集點\n⭐ 每購買一次獲得 1 點，集滿 10 點可兌換獎勵"
    )
    .setTimestamp()
    .setFooter({ text: "營業時間：店長在線時" });

  // 先在菜單 embed 中顯示所有項目
  coffeeShop.data.menu.forEach((item) => {
    embed.addFields({
      name: `${item.emoji || "☕"} ${item.name}`,
      value: `💰 ${item.price} 元`,
      inline: true,
    });
  });

  // 創建按鈕
  const rows = [];
  const buttonsPerRow = 2;

  console.log(`📋 準備創建菜單按鈕，共 ${coffeeShop.data.menu.length} 個項目`);

  for (let i = 0; i < coffeeShop.data.menu.length; i += buttonsPerRow) {
    const row = new ActionRowBuilder();

    for (
      let j = i;
      j < Math.min(i + buttonsPerRow, coffeeShop.data.menu.length);
      j++
    ) {
      const item = coffeeShop.data.menu[j];
      console.log(`🔘 創建按鈕: ${item.id} - ${item.name}`);

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`buy_${item.id}`)
          .setLabel(`${item.emoji || "☕"} ${item.name} - ${item.price}元`)
          .setStyle(ButtonStyle.Primary)
      );
    }

    if (row.components.length > 0) {
      rows.push(row);
    }
  }

  console.log(`📝 創建了 ${rows.length} 行按鈕`);

  if (rows.length > 5) {
    console.log(`⚠️ 按鈕行數超過限制，只顯示前5行`);
    rows.splice(5);
  }

  await channel.send({ embeds: [embed], components: rows });
  await interaction.reply({
    content: "✅ 菜單已發布到指定頻道！",
    ephemeral: true,
  });
}

// 類似地修復其他所有需要權限檢查的函數...
async function handleEditMenuCommand(interaction) {
  if (!interaction.guild || !interaction.member) {
    return await interaction.reply({
      content: "❌ 此指令只能在伺服器中使用！",
      ephemeral: true,
    });
  }

  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply({
      content: "❌ 只有店長和管理員可以編輯菜單！",
      ephemeral: true,
    });
  }

  // ... 其餘邏輯保持不變
}

// 修復按鈕互動處理
async function handleButtonInteraction(interaction) {
  console.log(
    `🔘 按鈕點擊: ${interaction.customId} 由 ${interaction.user.tag}`
  );

  // 檢查是否在伺服器中
  if (!interaction.guild || !interaction.member) {
    return await interaction.reply({
      content: "❌ 此功能只能在伺服器中使用！",
      ephemeral: true,
    });
  }

  // 處理重新發布菜單按鈕
  if (interaction.customId === "republish_menu") {
    // 檢查權限
    if (
      !coffeeShop.isManager(interaction.member) &&
      !coffeeShop.isAdmin(interaction.member)
    ) {
      return await interaction.reply({
        content: "❌ 只有店長和管理員可以重新發布菜單！",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // 自動重新發布菜單
      const result = await republishInteractiveMenu(interaction.guild);

      if (result.success) {
        await interaction.editReply({
          content: `✅ 互動式菜單已更新！\n📍 位置：${result.channel}\n🔄 更新了 ${coffeeShop.data.menu.length} 個菜單項目`,
        });

        // 禁用按鈕
        const disabledButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("republish_menu_disabled")
            .setLabel("✅ 已更新")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("✅")
            .setDisabled(true)
        );

        await interaction.message.edit({
          components: [disabledButton],
        });
      } else {
        await interaction.editReply({
          content: `❌ 更新失敗：${result.error}`,
        });
      }
    } catch (error) {
      console.error("重新發布菜單失敗:", error);
      await interaction.editReply({
        content: "❌ 更新互動式菜單時發生錯誤！請手動使用 /發布菜單 指令。",
      });
    }
    return;
  }

  // 原有的購買按鈕處理邏輯
  if (!interaction.customId.startsWith("buy_")) {
    console.log(`❌ 無效的按鈕ID: ${interaction.customId}`);
    return;
  }

  try {
    // 立即回應互動，避免超時
    await interaction.deferReply({ ephemeral: true });

    const itemId = interaction.customId.replace("buy_", "");
    console.log(`🛒 嘗試購買項目: ${itemId}`);

    // 檢查項目是否存在
    const item = coffeeShop.data.menu.find((i) => i.id === itemId);
    if (!item) {
      console.log(`❌ 找不到項目: ${itemId}`);
      console.log(
        `📋 可用項目:`,
        coffeeShop.data.menu.map((i) => i.id)
      );
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

    // 隨機的感謝語句
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

    // 創建購買成功的回應
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

    // 如果集點達到兌換標準，提醒用戶
    if (result.points >= coffeeShop.data.settings.pointsToReward) {
      embed.addFields({
        name: "🎁 集點提醒",
        value: `你已經有 ${result.points} 點了！可以使用 \`/集點兌換\` 指令兌換獎勵！`,
        inline: false,
      });
    }

    // 編輯回覆
    await interaction.editReply({ embeds: [embed] });

    // 延遲發送公開訊息
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
        await interaction.reply({
          content: "❌ 處理購買時發生錯誤，請稍後再試！",
          ephemeral: true,
        });
      }
    } catch (replyError) {
      console.error("❌ 無法回覆互動:", replyError);
    }
  }
}
