# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: salem-multiplayer.spec.ts >> 摸到传染卡立即进入传染阶段，并能从左手边玩家选择未翻身份牌
- Location: tests/e2e/salem-multiplayer.spec.ts:233:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  13  |   });
  14  |   return { name, context, page: await context.newPage() };
  15  | }
  16  | 
  17  | async function openHome(page: Page, name: string) {
  18  |   await page.goto("/");
  19  |   await page.getByTestId("home-nickname-input").fill(name);
  20  | }
  21  | 
  22  | async function createRoom(page: Page): Promise<string> {
  23  |   await page.getByTestId("home-create-room-button").click();
  24  |   await expect(page).toHaveURL(/\/lobby\/[A-Z2-9]{6}$/);
  25  |   return (await page.getByTestId("lobby-room-code").innerText()).trim();
  26  | }
  27  | 
  28  | async function joinRoom(page: Page, name: string, roomCode: string) {
  29  |   await openHome(page, name);
  30  |   await page.getByTestId("home-room-code-input").fill(roomCode);
  31  |   await page.getByTestId("home-join-room-button").click();
  32  |   await expect(page).toHaveURL(new RegExp(`/lobby/${roomCode}$`));
  33  | }
  34  | 
  35  | async function ready(page: Page) {
  36  |   await page.getByTestId("lobby-ready-button").click();
  37  | }
  38  | 
  39  | async function startFourPlayerGame(browser: Browser, options: { waitForDay?: boolean } = {}) {
  40  |   const players = await Promise.all(["Alice", "Bob", "Cara", "Dan"].map((name) => createPlayer(browser, name)));
  41  |   const host = players[0];
  42  | 
  43  |   try {
  44  |     await openHome(host.page, host.name);
  45  |     const roomCode = await createRoom(host.page);
  46  | 
  47  |     for (const player of players.slice(1)) {
  48  |       await joinRoom(player.page, player.name, roomCode);
  49  |     }
  50  | 
  51  |     await Promise.all(players.map((player) => expect(player.page.getByTestId("lobby-player-count")).toContainText("4/12")));
  52  | 
  53  |     for (const player of players.slice(1)) {
  54  |       await ready(player.page);
  55  |     }
  56  | 
  57  |     await expect(host.page.getByTestId("lobby-start-button")).toBeEnabled();
  58  |     await host.page.getByTestId("lobby-start-button").click();
  59  |     await Promise.all(players.map((player) => expect(player.page).toHaveURL(/\/game\/[A-Z2-9]{6}$/)));
  60  |     await Promise.all(players.map((player) => expect(player.page.getByTestId("game-phase")).toBeVisible()));
  61  | 
  62  |     if (options.waitForDay) {
  63  |       await waitForDay(players);
  64  |     }
  65  | 
  66  |     return { players, host, roomCode };
  67  |   } catch (error) {
  68  |     await closePlayers(players);
  69  |     throw error;
  70  |   }
  71  | }
  72  | 
  73  | async function closePlayers(players: TestPlayer[]) {
  74  |   await Promise.all(players.map((player) => player.context.close()));
  75  | }
  76  | 
  77  | async function waitForDay(players: TestPlayer[]) {
  78  |   await Promise.all(players.map((player) => expect(player.page.getByTestId("game-phase")).toContainText("白天", { timeout: 20_000 })));
  79  | }
  80  | 
  81  | async function currentPlayer(players: TestPlayer[]): Promise<TestPlayer> {
  82  |   const deadline = Date.now() + 15_000;
  83  |   while (Date.now() < deadline) {
  84  |     for (const player of players) {
  85  |       if (await player.page.getByTestId("game-action-draw").isEnabled().catch(() => false)) {
  86  |         return player;
  87  |       }
  88  |     }
  89  |     await players[0].page.waitForTimeout(200);
  90  |   }
  91  |   throw new Error("No current player found");
  92  | }
  93  | 
  94  | async function pageWithVisibleLocator(players: TestPlayer[], selector: string): Promise<Page | null> {
  95  |   const deadline = Date.now() + 8_000;
  96  |   while (Date.now() < deadline) {
  97  |     for (const player of players) {
  98  |       if (await player.page.locator(selector).first().isVisible().catch(() => false)) {
  99  |         return player.page;
  100 |       }
  101 |     }
  102 |     await players[0].page.waitForTimeout(200);
  103 |   }
  104 |   return null;
  105 | }
  106 | 
  107 | async function setTopCard(roomCode: string, card: string) {
  108 |   const response = await fetch(`http://127.0.0.1:2567/api/test/rooms/${roomCode}/top-card`, {
  109 |     method: "POST",
  110 |     headers: { "content-type": "application/json" },
  111 |     body: JSON.stringify({ card }),
  112 |   });
> 113 |   expect(response.ok).toBeTruthy();
      |                       ^ Error: expect(received).toBeTruthy()
  114 | }
  115 | 
  116 | async function setPlayerHand(roomCode: string, playerId: string, cards: string[]) {
  117 |   const response = await fetch(`http://127.0.0.1:2567/api/test/rooms/${roomCode}/player-hand`, {
  118 |     method: "POST",
  119 |     headers: { "content-type": "application/json" },
  120 |     body: JSON.stringify({ playerId, cards }),
  121 |   });
  122 |   expect(response.ok).toBeTruthy();
  123 | }
  124 | 
  125 | async function getPlayerId(page: Page): Promise<string> {
  126 |   return await page.evaluate(() => {
  127 |     const state = sessionStorage.getItem("salem_player_id");
  128 |     return state || "";
  129 |   });
  130 | }
  131 | 
  132 | async function ensureCurrentPlayerId(page: Page): Promise<string> {
  133 |   const id = await getPlayerId(page);
  134 |   if (id) return id;
  135 | 
  136 |   return await page.evaluate(() => {
  137 |     const room = (window as unknown as { __salemRoom?: { sessionId?: string } }).__salemRoom;
  138 |     return room?.sessionId || "";
  139 |   });
  140 | }
  141 | 
  142 | async function firstOtherSeat(page: Page): Promise<string> {
  143 |   const seats = await page.locator('[data-testid^="game-player-seat-"][data-testid$="-select"]').evaluateAll((nodes) =>
  144 |     nodes
  145 |       .filter((testId) => {
  146 |         const button = testId as HTMLButtonElement;
  147 |         return !button.disabled;
  148 |       })
  149 |       .map((node) => node.getAttribute("data-testid") || "")
  150 |   );
  151 |   const seat = seats[0];
  152 |   if (!seat) throw new Error("No selectable target seat found");
  153 |   return seat;
  154 | }
  155 | 
  156 | test("语音未配置稳定降级，4 人建房、加入、准备、开始不被阻塞", async ({ browser }) => {
  157 |   const { players } = await startFourPlayerGame(browser);
  158 | 
  159 |   try {
  160 |     await Promise.all(players.map(async (player) => {
  161 |       await expect(player.page.getByTestId("game-voice-connected")).toContainText("语音未配置");
  162 |       await expect(player.page.getByTestId("game-mic-button")).toBeDisabled();
  163 |     }));
  164 |   } finally {
  165 |     await closePlayers(players);
  166 |   }
  167 | });
  168 | 
  169 | test("4 名玩家可开始游戏并由当前玩家真实点击抽牌", async ({ browser }) => {
  170 |   const { players } = await startFourPlayerGame(browser, { waitForDay: true });
  171 | 
  172 |   try {
  173 |     const actor = await currentPlayer(players);
  174 |     await actor.page.getByTestId("game-action-draw").click();
  175 |     await expect(actor.page.getByTestId("game-log")).toContainText(/drew|抽/i);
  176 |     await expect(actor.page.getByTestId("game-action-draw")).toBeDisabled();
  177 |   } finally {
  178 |     await closePlayers(players);
  179 |   }
  180 | });
  181 | 
  182 | test("出牌后仍停留在当前玩家回合，直到点击结束回合", async ({ browser }) => {
  183 |   const { players, roomCode } = await startFourPlayerGame(browser, { waitForDay: true });
  184 | 
  185 |   try {
  186 |     const actor = await currentPlayer(players);
  187 |     const actorId = await ensureCurrentPlayerId(actor.page);
  188 |     await setPlayerHand(roomCode, actorId, ["accusation", "accusation"]);
  189 |     await expect(actor.page.getByTestId("game-hand-card-0")).toBeVisible({ timeout: 5_000 });
  190 | 
  191 |     await actor.page.getByTestId("game-action-play").click();
  192 |     await actor.page.getByTestId("game-hand-card-0").click();
  193 |     await actor.page.getByTestId(await firstOtherSeat(actor.page)).click();
  194 | 
  195 |     await expect(actor.page.getByTestId("game-action-end-turn")).toBeEnabled();
  196 |     await expect(actor.page.getByText(/选择手牌|选择目标玩家/)).toBeVisible();
  197 |     await actor.page.getByTestId("game-action-end-turn").click();
  198 |     await expect(actor.page.getByTestId("game-action-draw")).toBeDisabled();
  199 |   } finally {
  200 |     await closePlayers(players);
  201 |   }
  202 | });
  203 | 
  204 | test("未出牌时协调员结束倒计时会触发默认摸牌", async ({ browser }) => {
  205 |   const { players, host } = await startFourPlayerGame(browser, { waitForDay: true });
  206 | 
  207 |   try {
  208 |     const actor = await currentPlayer(players);
  209 |     await expect(actor.page.getByTestId("game-action-draw")).toBeEnabled();
  210 |     await host.page.getByTestId("coordinator-end-timer").click();
  211 |     await expect(actor.page.getByTestId("game-log")).toContainText(/drew|抽/i, { timeout: 5_000 });
  212 |     await expect(actor.page.getByTestId("game-action-draw")).toBeDisabled();
  213 |   } finally {
```