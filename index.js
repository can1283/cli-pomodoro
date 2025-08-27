#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import notifier from "node-notifier";
import fs from "fs";
import path from "path";
import readline from "readline";

const program = new Command();

// Bildirim fonksiyonu (ikon merkezi)
function notify(message) {
  notifier.notify({
    title: "Pomodoro Timer",
    message,
    sound: true,
    icon: "logo.png", // ikon yolu
    appID: "Pomodoro CLI"
  });
}

// Stats dosyası
const statsDir = path.join(process.cwd(), "data");
const statsFile = path.join(statsDir, "stats.json");

if (!fs.existsSync(statsDir)) fs.mkdirSync(statsDir);
if (!fs.existsSync(statsFile)) fs.writeFileSync(statsFile, "{}");

function loadStats() {
  const raw = fs.readFileSync(statsFile, "utf-8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("⚠️ stats.json parse hatası, sıfırlanıyor.");
    return {};
  }
}

function saveStats(stats) {
  fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim().toLowerCase());
  }));
}

// ASCII progress bar fonksiyonu
function renderProgressBar(totalMinutes, elapsedSeconds) {
  const totalSeconds = totalMinutes * 60;
  const progressBlocks = 20;
  const filled = Math.round(elapsedSeconds / totalSeconds * progressBlocks);
  const bar = "█".repeat(filled) + "-".repeat(progressBlocks - filled);
  return bar;
}

function countdown(minutes, type) {
  return new Promise(resolve => {
    let m = minutes;
    let s = 0;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed++;
      const bar = renderProgressBar(minutes, elapsed);
      process.stdout.write(`\r${type}: [${bar}] ${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} `);

      if (s === 0) {
        if (m === 0) {
          clearInterval(timer);
          console.log();
          resolve();
        } else {
          m--;
          s = 59;
        }
      } else {
        s--;
      }
      // **fazladan s-- kaldırıldı**
    }, 1000);
  });
}


// Interaktif Pomodoro
async function startPomodoro(workMinutes = 25, breakMinutes = 5) {
  let currentWork = workMinutes;
  let currentBreak = breakMinutes;

  while (true) {
    console.clear();
    console.log(chalk.green(`Pomodoro Başladı: ${currentWork} dk çalışma süresi.`));

    await countdown(currentWork, "Kalan Süre");

    notify("Çalışma bitti!"); // ikonlu bildirim

    // Stats kaydet
    const stats = loadStats();
    const today = new Date().toISOString().split("T")[0];
    stats[today] = (stats[today] || 0) + 1;
    saveStats(stats);

    let startBreak = await askQuestion("Mola başlasın mı? (e/h): ");
    if (startBreak !== "e") break;

    let sameTimes = await askQuestion("Süre aynı kalsın mı? (e/h): ");
    if (sameTimes !== "e") {
      const newWork = await askQuestion("Yeni çalışma süresini dakika olarak gir: ");
      const newBreak = await askQuestion("Yeni mola süresini dakika olarak gir: ");
      currentWork = parseInt(newWork) || workMinutes;
      currentBreak = parseInt(newBreak) || breakMinutes;
    }

    console.clear();
    console.log(chalk.cyan(`Mola başladı: ${currentBreak} dk`));
    await countdown(currentBreak, "Mola");

    notify("Mola bitti!"); // ikonlu bildirim

    const continueNext = await askQuestion("Yeni Pomodoro başlatılsın mı? (e/h): ");
    if (continueNext !== "e") break;
  }

  // Oturum tamamlandı, banner ve info göster
  console.clear();
  console.log(chalk.green("Pomodoro oturumu tamamlandı!"));
  console.log(chalk.green("GitHub: https://github.com/can1283"));
}

// CLI Komutları
program
  .command("start")
  .description("Pomodoro Timer başlat")
  .option("-c, --calis <minutes>", "Çalışma süresi", 25)
  .option("-m, --mola <minutes>", "Mola süresi", 5)
  .action(async (options) => {
    await startPomodoro(Number(options.calis), Number(options.mola));
  });

program
  .command("stats")
  .description("Günlük Pomodoro istatistiklerini göster")
  .action(() => {
    const stats = loadStats();
    console.log(chalk.yellow("📊 Günlük Pomodorolar:"));
    for (const day in stats) {
      console.log(`${day}: ${stats[day]} Pomodoro`);
    }
  });

program.parse(process.argv);
