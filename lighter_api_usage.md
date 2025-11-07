## Lighter.xyz API 与 WebSocket 接入

本项目提供对 Lighter 的基础接入，用于获取订单簿数据与简易 WebSocket 订阅演示。

### REST：订单簿

- 方法：`src/api/lighter.js#orderBooks()` / `orderBookDetails(marketIndex)`
- 可选认证：若提供 `LIGHTER_AUTH_TOKEN`，将附带 `Authorization` 头。
- 端点：默认 `https://mainnet.zklighter.elliot.ai`（可通过 `LIGHTER_BASE_URL` 覆盖）

### WebSocket：订单簿频道

- 启动演示：`npm run lighter:wsdemo`
- 环境变量：
  - `LIGHTER_MARKET_INDEX`（默认 `0`）
  - `LIGHTER_WS_DEMO_MS`（演示时长，默认 `20000` 毫秒）
- 行为：订阅 `order_book:{MARKET_INDEX}`，打印最优买卖价更新，20 秒后自动退出。

注意：
- 部分 REST/WS 频道可能需要认证令牌，请参考 Lighter 文档获取并填充 `LIGHTER_AUTH_TOKEN`。