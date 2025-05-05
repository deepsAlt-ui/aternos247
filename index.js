const express = require("express");
const mineflayer = require("mineflayer");
const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");
const armorManager = require("mineflayer-armor-manager");
const pvp = require("mineflayer-pvp").plugin;
const AutoAuth = require("mineflayer-auto-auth");

const app = express();
const port = process.env.PORT || 8080;

app.get("/", (_, res) => res.send("Bot activo"));
app.listen(port, () => {
  console.log(`Servidor Express activo en el puerto ${port}`);
});

function createBot() {
  const bot = mineflayer.createBot({
    host: "leyendscraft.aternos.me",
    port: 41324,
    username: "LeyendsHolder",
    version: false,
    plugins: [AutoAuth],
    AutoAuth: "bot112022",
  });

  bot.loadPlugin(pvp);
  bot.loadPlugin(armorManager);
  bot.loadPlugin(pathfinder);

  let guardPos = null;

  bot.on("playerCollect", (collector) => {
    if (collector !== bot.entity) return;

    setTimeout(() => {
      const sword = bot.inventory.items().find(i => i.name.includes("sword"));
      if (sword) bot.equip(sword, "hand");
    }, 150);

    setTimeout(() => {
      const shield = bot.inventory.items().find(i => i.name.includes("shield"));
      if (shield) bot.equip(shield, "off-hand");
    }, 250);
  });

  function guardArea(pos) {
    guardPos = pos.clone();
    if (!bot.pvp.target) moveToGuardPos();
  }

  function stopGuarding() {
    guardPos = null;
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }

  function moveToGuardPos() {
    const mcData = require("minecraft-data")(bot.version);
    const movements = new Movements(bot, mcData);
    bot.pathfinder.setMovements(movements);
    bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z));
  }

  bot.on("chat", (username, message) => {
    if (message === "guard") {
      const player = bot.players[username];
      if (player?.entity) {
        bot.chat("I will!");
        guardArea(player.entity.position);
      }
    }
    if (message === "stop") {
      bot.chat("I will stop!");
      stopGuarding();
    }
  });

  bot.on("physicTick", () => {
    if (bot.pvp.target || bot.pathfinder.isMoving()) return;

    const entity = bot.nearestEntity();
    if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0));
  });

  bot.on("physicTick", () => {
    if (!guardPos) return;

    const entity = bot.nearestEntity(e =>
      e.type === "mob" &&
      e.mobType !== "Armor Stand" &&
      e.position.distanceTo(bot.entity.position) < 16
    );
    if (entity) bot.pvp.attack(entity);
  });

  bot.on("kicked", console.log);
  bot.on("error", console.log);
  bot.on("end", () => {
    console.log("Bot desconectado. Reiniciando...");
    setTimeout(createBot, 5000);
  });
}

createBot();
