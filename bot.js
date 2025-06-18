// 在編輯菜單指令處理函數中添加自動重新發布功能

async function handleEditMenuCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply({
      content: "❌ 只有店長和管理員可以編輯菜單！",
      ephemeral: true,
    });
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case "新增":
      const id = interaction.options.getString("id").toLowerCase().trim();
      const name = interaction.options.getString("名稱");
      const price = interaction.options.getInteger("價格");
      const emoji = interaction.options.getString("表情符號") || "☕";

      if (price <= 0) {
        return await interaction.reply({
          content: "❌ 價格必須大於0！",
          ephemeral: true,
        });
      }

      if (coffeeShop.data.menu.find((item) => item.id === id)) {
        return await interaction.reply({
          content: "❌ 此ID已存在！請使用不同的ID。",
          ephemeral: true,
        });
      }

      const newItem = { id, name, price, emoji, image: emoji };
      coffeeShop.data.menu.push(newItem);
      coffeeShop.saveData();

      console.log(`➕ 新增菜單項目:`, newItem);
      console.log(`📋 目前菜單項目數量: ${coffeeShop.data.menu.length}`);

      // 檢查是否設定了菜單頻道
      const hasMenuChannel = coffeeShop.data.settings.menuChannelId;

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
        .setTimestamp();

      if (hasMenuChannel) {
        addEmbed.setFooter({
          text: "⚠️ 請使用 /發布菜單 或點擊下方按鈕來更新互動式菜單！",
        });

        // 添加自動重新發布按鈕
        const updateButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("republish_menu")
            .setLabel("🔄 立即更新互動菜單")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔄")
        );

        await interaction.reply({
          embeds: [addEmbed],
          components: [updateButton],
        });
      } else {
        addEmbed.setFooter({
          text: "請先設定菜單頻道，然後使用 /發布菜單！",
        });
        await interaction.reply({ embeds: [addEmbed] });
      }
      break;

    case "刪除":
      const itemToDelete = interaction.options.getString("id");
      const index = coffeeShop.data.menu.findIndex(
        (item) => item.id === itemToDelete
      );

      if (index === -1) {
        return await interaction.reply({
          content: "❌ 找不到這個菜單項目！",
          ephemeral: true,
        });
      }

      const deletedItem = coffeeShop.data.menu[index];
      coffeeShop.data.menu.splice(index, 1);
      coffeeShop.saveData();

      const deleteEmbed = new EmbedBuilder()
        .setTitle("✅ 菜單項目刪除成功！")
        .setDescription(`已刪除：${deletedItem.emoji} **${deletedItem.name}**`)
        .setColor("#FF6B6B")
        .addFields({
          name: "📊 剩餘菜單項目",
          value: `${coffeeShop.data.menu.length} 個`,
          inline: true,
        })
        .setTimestamp();

      if (coffeeShop.data.settings.menuChannelId) {
        deleteEmbed.setFooter({
          text: "⚠️ 請使用 /發布菜單 或點擊下方按鈕來更新互動式菜單！",
        });

        const updateButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("republish_menu")
            .setLabel("🔄 立即更新互動菜單")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔄")
        );

        await interaction.reply({
          embeds: [deleteEmbed],
          components: [updateButton],
        });
      } else {
        await interaction.reply({ embeds: [deleteEmbed] });
      }
      break;
  }
}

// 添加處理重新發布按鈕的功能
async function handleButtonInteraction(interaction) {
  console.log(
    `🔘 按鈕點擊: ${interaction.customId} 由 ${interaction.user.tag}`
  );

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

  // ... 其餘購買邏輯保持不變 ...
}

// 新增自動重新發布菜單的函數
async function republishInteractiveMenu(guild) {
  try {
    if (!coffeeShop.data.settings.menuChannelId) {
      return { success: false, error: "未設定菜單頻道" };
    }

    if (coffeeShop.data.menu.length === 0) {
      return { success: false, error: "菜單是空的" };
    }

    const channel = guild.channels.cache.get(
      coffeeShop.data.settings.menuChannelId
    );
    if (!channel) {
      return { success: false, error: "找不到菜單頻道" };
    }

    // 創建新的菜單 embed
    const embed = new EmbedBuilder()
      .setTitle("☕ 燒肉Cafe 菜單")
      .setColor("#8B4513")
      .setDescription(
        "點擊下方按鈕購買你喜歡的飲品和甜點！\n💰 購買後會立即扣款並獲得集點\n⭐ 每購買一次獲得 1 點，集滿 10 點可兌換獎勵"
      )
      .setTimestamp()
      .setFooter({ text: "營業時間：店長在線時 • 菜單已更新" });

    // 添加菜單項目
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

    for (let i = 0; i < coffeeShop.data.menu.length; i += buttonsPerRow) {
      const row = new ActionRowBuilder();

      for (
        let j = i;
        j < Math.min(i + buttonsPerRow, coffeeShop.data.menu.length);
        j++
      ) {
        const item = coffeeShop.data.menu[j];
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

    if (rows.length > 5) {
      rows.splice(5); // Discord 限制最多 5 行
    }

    // 刪除舊的菜單訊息（可選）
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      const botMessages = messages.filter(
        (msg) =>
          msg.author.id === guild.client.user.id &&
          msg.embeds.length > 0 &&
          msg.embeds[0].title?.includes("燒肉Cafe 菜單")
      );

      if (botMessages.size > 0) {
        await Promise.all(
          botMessages.map((msg) => msg.delete().catch(() => {}))
        );
        console.log(`🗑️ 已清理 ${botMessages.size} 個舊菜單訊息`);
      }
    } catch (error) {
      console.log("清理舊訊息時發生錯誤（忽略）:", error.message);
    }

    // 發送新的菜單
    await channel.send({ embeds: [embed], components: rows });

    console.log(
      `✅ 互動式菜單已重新發布，共 ${coffeeShop.data.menu.length} 個項目`
    );

    return {
      success: true,
      channel: channel.toString(),
      itemCount: coffeeShop.data.menu.length,
    };
  } catch (error) {
    console.error("重新發布菜單失敗:", error);
    return { success: false, error: error.message };
  }
}

// 修改快速設定菜單指令，添加自動發布選項
async function handleQuickSetupMenuCommand(interaction) {
  if (
    !coffeeShop.isManager(interaction.member) &&
    !coffeeShop.isAdmin(interaction.member)
  ) {
    return await interaction.reply({
      content: "❌ 只有店長和管理員可以快速設定菜單！",
      ephemeral: true,
    });
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

  // 如果有設定菜單頻道，提供自動發布選項
  if (coffeeShop.data.settings.menuChannelId && addedCount > 0) {
    embed.setFooter({
      text: "點擊下方按鈕立即發布互動式菜單，或使用 /發布菜單 指令！",
    });

    const publishButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("republish_menu")
        .setLabel("🚀 立即發布互動菜單")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🚀")
    );

    await interaction.reply({ embeds: [embed], components: [publishButton] });
  } else {
    embed.setFooter({ text: "記得使用 /發布菜單 來發布互動式菜單！" });
    await interaction.reply({ embeds: [embed] });
  }
}
