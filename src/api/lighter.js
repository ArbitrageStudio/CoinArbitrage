const axios = require('axios');
const WebSocket = require('ws');

class LighterApi {
  constructor({ baseURL, authToken } = {}) {
    this.baseURL = baseURL || 'https://mainnet.zklighter.elliot.ai';
    this.wsURL = (this.baseURL.replace('https://', 'wss://')) + '/stream';
    this.authToken = authToken || process.env.LIGHTER_AUTH_TOKEN || undefined;
    this.client = axios.create({ baseURL: this.baseURL, timeout: 10000 });
  }

  // 获取所有市场的订单簿摘要（可能无需认证）
  async orderBooks() {
    const url = '/api/v1/order_books';
    const headers = this.authToken ? { Authorization: this.authToken } : undefined;
    const resp = await this.client.get(url, { headers });
    return resp.data;
  }

  // 获取指定市场订单簿详情
  async orderBookDetails(marketIndex) {
    const url = `/api/v1/order_book_details?market_index=${marketIndex}`;
    const headers = this.authToken ? { Authorization: this.authToken } : undefined;
    const resp = await this.client.get(url, { headers });
    return resp.data;
  }

  // 连接 WebSocket 并订阅订单簿频道
  connectOrderBook(marketIndex, { onOpen, onUpdate, onError } = {}) {
    const ws = new WebSocket(this.wsURL);
    ws.on('open', () => {
      if (typeof onOpen === 'function') onOpen();
      // 订阅订单簿频道
      const subMsg = { type: 'subscribe', channels: [`order_book:${marketIndex}`] };
      ws.send(JSON.stringify(subMsg));
    });
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data && data.type && data.type.startsWith('update/') && data.channel && data.order_book) {
          if (typeof onUpdate === 'function') onUpdate(data);
        }
      } catch (e) {
        if (typeof onError === 'function') onError(e);
      }
    });
    ws.on('error', (err) => {
      if (typeof onError === 'function') onError(err);
    });
    return ws;
  }
}

module.exports = LighterApi;