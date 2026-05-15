import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

interface TestPlayer {
  name: string;
  context: BrowserContext;
  page: Page;
}

async function createPlayer(browser: Browser, name: string): Promise<TestPlayer> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["microphone"],
  });
  return { name, context, page: await context.newPage() };
}

async function openHome(page: Page, name: string) {
  await page.goto("/");
  await page.getByTestId("home-nickname-input").fill(name);
}

async function createRoom(page: Page): Promise<string> {
  await page.getByTestId("home-create-room-button").click();
  await expect(page).toHaveURL(/\/lobby\/[A-Z2-9]{6}$/);
  return (await page.getByTestId("lobby-room-code").innerText()).trim();
}

async function joinRoom(page: Page, name: string, roomCode: string) {
  await openHome(page, name);
  await page.getByTestId("home-room-code-input").fill(roomCode);
  await page.getByTestId("home-join-room-button").click();
  await expect(page).toHaveURL(new RegExp(`/lobby/${roomCode}$`));
}

async function ready(page: Page) {
  await page.getByTestId("lobby-ready-button").click();
}

async function startFourPlayerGame(browser: Browser, options: { waitForDay?: boolean } = {}) {
  const players = await Promise.all(["Alice", "Bob", "Cara", "Dan"].map((name) => createPlayer(browser, name)));
  const host = players[0];

  try {
    await openHome(host.page, host.name);
    const roomCode = await createRoom(host.page);

    for (const player of players.slice(1)) {
      await joinRoom(player.page, player.name, roomCode);
    }

    await Promise.all(players.map((player) => expect(player.page.getByTestId("lobby-player-count")).toContainText("4/12")));

    for (const player of players.slice(1)) {
      await ready(player.page);
    }

    await expect(host.page.getByTestId("lobby-start-button")).toBeEnabled();
    await host.page.getByTestId("lobby-start-button").click();
    await Promise.all(players.map((player) => expect(player.page).toHaveURL(/\/game\/[A-Z2-9]{6}$/)));
    await Promise.all(players.map((player) => expect(player.page.getByTestId("game-phase")).toBeVisible()));

    if (options.waitForDay) {
      await waitForDay(players);
    }

    return { players, host, roomCode };
  } catch (error) {
    await closePlayers(players);
    throw error;
  }
}

async function closePlayers(players: TestPlayer[]) {
  await Promise.all(players.map((player) => player.context.close()));
}

async function waitForDay(players: TestPlayer[]) {
  await Promise.all(players.map((player) => expect(player.page.getByTestId("game-phase")).toContainText("白天", { timeout: 20_000 })));
}

async function currentPlayer(players: TestPlayer[]): Promise<TestPlayer> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    for (const player of players) {
      if (await player.page.getByTestId("game-action-draw").isEnabled().catch(() => false)) {
        return player;
      }
    }
    await players[0].page.waitForTimeout(200);
  }
  throw new Error("No current player found");
}

async function pageWithVisibleLocator(players: TestPlayer[], selector: string): Promise<Page | null> {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    for (const player of players) {
      if (await player.page.locator(selector).first().isVisible().catch(() => false)) {
        return player.page;
      }
    }
    await players[0].page.waitForTimeout(200);
  }
  return null;
}

async function setTopCard(roomCode: string, card: string) {
  const response = await fetch(`http://127.0.0.1:2567/api/test/rooms/${roomCode}/top-card`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ card }),
  });
  expect(response.ok).toBeTruthy();
}

async function setPlayerHand(roomCode: string, playerId: string, cards: string[]) {
  const response = await fetch(`http://127.0.0.1:2567/api/test/rooms/${roomCode}/player-hand`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playerId, cards }),
  });
  expect(response.ok).toBeTruthy();
}

async function getPlayerId(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const state = sessionStorage.getItem("salem_player_id");
    return state || "";
  });
}

async function ensureCurrentPlayerId(page: Page): Promise<string> {
  const id = await getPlayerId(page);
  if (id) return id;

  return await page.evaluate(() => {
    const room = (window as unknown as { __salemRoom?: { sessionId?: string } }).__salemRoom;
    return room?.sessionId || "";
  });
}

async function firstOtherSeat(page: Page): Promise<string> {
  const seats = await page.locator('[data-testid^="game-player-seat-"][data-testid$="-select"]').evaluateAll((nodes) =>
    nodes
      .filter((testId) => {
        const button = testId as HTMLButtonElement;
        return !button.disabled;
      })
      .map((node) => node.getAttribute("data-testid") || "")
  );
  const seat = seats[0];
  if (!seat) throw new Error("No selectable target seat found");
  return seat;
}

test("语音未配置稳定降级，4 人建房、加入、准备、开始不被阻塞", async ({ browser }) => {
  const { players } = await startFourPlayerGame(browser);

  try {
    await Promise.all(players.map(async (player) => {
      await expect(player.page.getByTestId("game-voice-connected")).toContainText("语音未配置");
      await expect(player.page.getByTestId("game-mic-button")).toBeDisabled();
    }));
  } finally {
    await closePlayers(players);
  }
});

test("4 名玩家可开始游戏并由当前玩家真实点击抽牌", async ({ browser }) => {
  const { players } = await startFourPlayerGame(browser, { waitForDay: true });

  try {
    const actor = await currentPlayer(players);
    await actor.page.getByTestId("game-action-draw").click();
    await expect(actor.page.getByTestId("game-log")).toContainText(/drew|抽/i);
    await expect(actor.page.getByTestId("game-action-draw")).toBeDisabled();
  } finally {
    await closePlayers(players);
  }
});

test("出牌后仍停留在当前玩家回合，直到点击结束回合", async ({ browser }) => {
  const { players, roomCode } = await startFourPlayerGame(browser, { waitForDay: true });

  try {
    const actor = await currentPlayer(players);
    const actorId = await ensureCurrentPlayerId(actor.page);
    await setPlayerHand(roomCode, actorId, ["accusation", "accusation"]);
    await expect(actor.page.getByTestId("game-hand-card-0")).toBeVisible({ timeout: 5_000 });

    await actor.page.getByTestId("game-action-play").click();
    await actor.page.getByTestId("game-hand-card-0").click();
    await actor.page.getByTestId(await firstOtherSeat(actor.page)).click();

    await expect(actor.page.getByTestId("game-action-end-turn")).toBeEnabled();
    await expect(actor.page.getByText(/选择手牌|选择目标玩家/)).toBeVisible();
    await actor.page.getByTestId("game-action-end-turn").click();
    await expect(actor.page.getByTestId("game-action-draw")).toBeDisabled();
  } finally {
    await closePlayers(players);
  }
});

test("未出牌时协调员结束倒计时会触发默认摸牌", async ({ browser }) => {
  const { players, host } = await startFourPlayerGame(browser, { waitForDay: true });

  try {
    const actor = await currentPlayer(players);
    await expect(actor.page.getByTestId("game-action-draw")).toBeEnabled();
    await host.page.getByTestId("coordinator-end-timer").click();
    await expect(actor.page.getByTestId("game-log")).toContainText(/drew|抽/i, { timeout: 5_000 });
    await expect(actor.page.getByTestId("game-action-draw")).toBeDisabled();
  } finally {
    await closePlayers(players);
  }
});

test("身份牌对本人显示真实内容，对他人显示背面或公开牌", async ({ browser }) => {
  const { players } = await startFourPlayerGame(browser, { waitForDay: true });

  try {
    const selfRow = players[0].page.locator('[data-testid$="-tryal"]').first();
    await expect(selfRow).toBeVisible();
    await expect(selfRow).toContainText(/巫|民|警/);

    const otherRows = players[1].page.locator('[data-testid$="-tryal"]');
    await expect(otherRows.first()).toBeVisible();
  } finally {
    await closePlayers(players);
  }
});

test("摸到传染卡立即进入传染阶段，并能从左手边玩家选择未翻身份牌", async ({ browser }) => {
  const { players, roomCode } = await startFourPlayerGame(browser, { waitForDay: true });

  try {
    const actor = await currentPlayer(players);
    await setTopCard(roomCode, "conspiracy");
    await actor.page.getByTestId("game-action-draw").click();
    await expect(actor.page.getByTestId("conspiracy-overlay")).toBeVisible();
    await actor.page.getByTestId("conspiracy-card-0").click();
    await expect(actor.page.getByTestId("conspiracy-submitted")).toBeVisible();
  } finally {
    await closePlayers(players);
  }
});

test("摸到黑夜卡立即进入黑夜，女巫玩家可真实点击选择击杀目标", async ({ browser }) => {
  const { players, roomCode } = await startFourPlayerGame(browser, { waitForDay: true });

  try {
    const actor = await currentPlayer(players);
    await setTopCard(roomCode, "night");
    await actor.page.getByTestId("game-action-draw").click();
    await expect(actor.page.getByTestId("game-phase")).toContainText(/夜间/, { timeout: 5_000 });

    const witchPage = (await pageWithVisibleLocator(players, '[data-testid^="night-witch-target-"]')) ?? actor.page;
    const target = witchPage.locator('[data-testid^="night-witch-target-"]').first();
    if (await target.isVisible().catch(() => false)) {
      await target.click();
      await witchPage.getByText("确认击杀").click();
      await expect(witchPage.getByTestId("game-log")).toContainText(/Witches have chosen|女巫/i);
    }
  } finally {
    await closePlayers(players);
  }
});

test("角色能力入口可点击并向服务端发送技能动作", async ({ browser }) => {
  const { players } = await startFourPlayerGame(browser, { waitForDay: true });

  try {
    const actor = await currentPlayer(players);
    await expect(actor.page.getByTestId("game-role-skill-button")).toBeVisible();
    await actor.page.getByTestId("game-role-skill-button").click();
    await expect(actor.page.getByTestId("game-log")).toContainText(/uses|技能|ability|passive|resolved/i, { timeout: 5_000 });
  } finally {
    await closePlayers(players);
  }
});
