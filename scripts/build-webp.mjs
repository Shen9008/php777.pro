/**
 * Converts JPG/PNG assets under images/ into optimised WebP in images/webp/.
 * Run: npm run build:images
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const imagesDir = path.join(root, "images");
const outDir = path.join(imagesDir, "webp");

const jobs = [
  ["Hero Banner/Bonuses.jpg", "hero-bonuses.webp"],
  ["Hero Banner/Featured Game strips.jpg", "hero-featured-strips.webp"],
  ["Hero Banner/Live Casino.jpg", "hero-live-casino.webp"],
  ["Hero Banner/Player Guide.jpg", "hero-player-guide.webp"],
  ["Hero Banner/Responsible gaming.jpg", "hero-responsible-gaming.webp"],
  ["Hero Banner/Slots.jpg", "hero-slots.webp"],
  ["Home/m99 title infographic.jpg", "home-infographic.webp"],
  ["Home/Game/Slots.jpg", "home-game-slots.webp"],
  ["Home/Game/Live.jpg", "home-game-live.webp"],
  ["Home/Game/Fast.jpg", "home-game-fast.webp"],
  ["Home/Game/Arcade.jpg", "home-game-arcade.webp"],
  ["Home/Game/Table.jpg", "home-game-table.webp"],
  ["Home/Game/Jackpot.jpg", "home-game-jackpot.webp"],
  ["Home/Popular live casino/Baccarat.jpg", "home-live-baccarat.webp"],
  ["Home/Popular live casino/Live blackjack.jpg", "home-live-blackjack.webp"],
  ["Home/Popular live casino/Live roulette.jpg", "home-live-roulette.webp"],
  ["Home/Popular live casino/Shows Dice.jpg", "home-live-shows-dice.webp"],
  ["Home/Popular type of slot/Megaways.jpg", "home-slot-megaways.webp"],
  ["Home/Popular type of slot/Feature tile.jpg", "home-slot-feature-tile.webp"],
  ["Home/Popular type of slot/Bonus buy.jpg", "home-slot-bonus-buy.webp"],
  ["Home/Popular type of slot/Instant crash.jpg", "home-slot-instant-crash.webp"],
  ["Home/Popular type of slot/Jackpot art.jpg", "home-slot-jackpot-art.webp"],
  ["Home/Popular type of slot/Arcade fish.jpg", "home-slot-arcade-fish.webp"],
  ["Live casino/Speed baccarat no commision.jpg", "live-speed-baccarat.webp"],
  ["Live casino/Immersive multi camera roulette.jpg", "live-immersive-roulette.webp"],
  ["Live casino/Blackjack with bet behind.jpg", "live-blackjack-bet-behind.webp"],
  ["Live casino/Sic bo dragon tiger.jpg", "live-sic-bo-dragon-tiger.webp"],
  ["Live casino/Game show wheels dice towers.jpg", "live-game-show-wheels.webp"],
  ["Live casino/Poker style live hybrids.jpg", "live-poker-hybrids.webp"],
  ["Live casino/Table preview.jpg", "live-zigzag-table.webp"],
  ["Live casino/Baccarat stream.jpg", "live-zigzag-baccarat.webp"],
  ["Slots/Chill session art.jpg", "slots-chill.webp"],
  ["Slots/High energy art.jpg", "slots-energy.webp"],
  ["Slots/Megaways.jpg", "slots-strip-megaways.webp"],
  ["Slots/Hold & Spin.jpg", "slots-strip-hold-spin.webp"],
  ["Slots/Bonus Buy.jpg", "slots-strip-bonus-buy.webp"],
  ["Slots/Turbo.jpg", "slots-strip-turbo.webp"],
];

async function toWebp(srcRel, destName) {
  const src = path.join(imagesDir, ...srcRel.split("/"));
  const dest = path.join(outDir, destName);
  if (!fs.existsSync(src)) {
    console.warn("skip (missing):", srcRel);
    return;
  }
  await fs.promises.mkdir(outDir, { recursive: true });
  await sharp(src)
    .webp({ quality: 82, effort: 6, smartSubsample: true })
    .toFile(dest);
  const st = await fs.promises.stat(dest);
  console.log("ok", destName, `(${(st.size / 1024).toFixed(1)} KB)`);
}

async function main() {
  for (const [src, dest] of jobs) {
    await toWebp(src, dest);
  }

  const logoPng = path.join(imagesDir, "m99 logo.png");
  if (fs.existsSync(logoPng)) {
    await fs.promises.mkdir(outDir, { recursive: true });
    await sharp(logoPng)
      .resize({ width: 160, height: 160, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90, effort: 6 })
      .toFile(path.join(outDir, "logo-m99.webp"));
    console.log("ok logo-m99.webp");
  }

  const ogSrc = path.join(imagesDir, "Hero Banner", "Slots.jpg");
  if (fs.existsSync(ogSrc)) {
    await sharp(ogSrc)
      .resize(1200, 630, { fit: "cover", position: "attention" })
      .webp({ quality: 85, effort: 6 })
      .toFile(path.join(outDir, "og-share.webp"));
    console.log("ok og-share.webp (1200×630)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
