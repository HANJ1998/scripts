# 微信公众号图片提取 API

这是一个部署在 Cloudflare Workers 上的微信公众号文章图片提取 API。

接口功能：

- 接收微信公众号文章链接
- 服务端请求文章 HTML
- 提取文章标题、描述、图片链接
- 返回 JSON 数据
- 支持 CORS 跨域
- 支持 Bearer Token 鉴权
- 支持 KV 限流
- 支持 Idempotency-Key 幂等缓存
- 支持浏览器控制台直接测试

---

## 一、接口地址

```txt
POST https://wechat-batch.hanj1998.workers.dev/api/extract
```

健康检查接口：

```txt
GET https://wechat-batch.hanj1998.workers.dev/api/health
```

---

## 二、请求方式

```txt
POST
```

---

## 三、请求头

| Header | 必填 | 说明 |
|---|---:|---|
| Content-Type | 是 | 固定为 `application/json` |
| Authorization | 是 | Bearer Token 鉴权 |
| Idempotency-Key | 否 | 幂等键，防止重复请求 |

示例：

```txt
Content-Type: application/json
Authorization: Bearer 你的_API_TOKEN
Idempotency-Key: 随机 UUID
```

---

## 四、请求参数

请求体为 JSON。

```json
{
  "url": "https://mp.weixin.qq.com/s/W0QrnWEILeJu-Nmdpr5zFw"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| url | string | 是 | 微信公众号文章链接，目前只允许 `mp.weixin.qq.com` |

---

## 五、成功响应

```json
{
  "ok": true,
  "requestId": "26d10627-f457-498e-9de8-712313dc3d0d",
  "sourceUrl": "https://mp.weixin.qq.com/s/W0QrnWEILeJu-Nmdpr5zFw",
  "title": "文章标题",
  "description": "文章描述",
  "count": 3,
  "images": [
    "https://mmbiz.qpic.cn/xxx",
    "https://mmbiz.qpic.cn/xxx",
    "https://mmbiz.qpic.cn/xxx"
  ]
}
```

字段说明：

| 字段 | 说明 |
|---|---|
| ok | 是否成功 |
| requestId | 当前请求 ID，方便排查日志 |
| sourceUrl | 原始公众号文章链接 |
| title | 文章标题 |
| description | 文章描述 |
| count | 提取到的图片数量 |
| images | 图片 URL 列表 |

---

## 六、失败响应

### 1. 缺少 Token

```json
{
  "ok": false,
  "code": "TOKEN_REQUIRED",
  "message": "缺少访问 token",
  "requestId": "..."
}
```

### 2. Token 错误

```json
{
  "ok": false,
  "code": "INVALID_TOKEN",
  "message": "token 不正确",
  "requestId": "..."
}
```

### 3. 服务端未配置 Token

```json
{
  "ok": false,
  "code": "TOKEN_NOT_CONFIGURED",
  "message": "服务端未配置 API_TOKEN",
  "requestId": "..."
}
```

### 4. 请求参数错误

```json
{
  "ok": false,
  "code": "BAD_REQUEST",
  "message": "url 必须是字符串",
  "requestId": "..."
}
```

### 5. 请求过于频繁

```json
{
  "ok": false,
  "code": "RATE_LIMITED",
  "message": "请求过于频繁，请稍后再试",
  "requestId": "..."
}
```

### 6. 微信文章请求失败

```json
{
  "ok": false,
  "code": "UPSTREAM_ERROR",
  "message": "微信文章请求失败，状态码：403",
  "requestId": "..."
}
```

---

## 七、响应头

接口会返回以下响应头：

| Header | 说明 |
|---|---|
| X-Request-Id | 当前请求 ID |
| X-Ratelimit-Limit | 限流总次数 |
| X-Ratelimit-Remaining | 当前窗口剩余次数 |
| X-Ratelimit-Reset | 限流窗口重置时间，Unix 时间戳 |

示例：

```txt
X-Request-Id: 26d10627-f457-498e-9de8-712313dc3d0d
X-Ratelimit-Limit: 10
X-Ratelimit-Remaining: 9
X-Ratelimit-Reset: 1779434650
```

---

## 八、浏览器控制台测试

打开任意网页，按 F12 打开控制台，执行：

```js
(async () => {
  try {
    const res = await fetch("https://wechat-batch.hanj1998.workers.dev/api/extract", {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 你的_API_TOKEN",
        "Idempotency-Key": crypto.randomUUID()
      },
      body: JSON.stringify({
        url: "https://mp.weixin.qq.com/s/W0QrnWEILeJu-Nmdpr5zFw"
      })
    });

    console.log("HTTP 状态:", res.status);
    console.log("X-Request-Id:", res.headers.get("X-Request-Id"));
    console.log("X-Ratelimit-Limit:", res.headers.get("X-Ratelimit-Limit"));
    console.log("X-Ratelimit-Remaining:", res.headers.get("X-Ratelimit-Remaining"));
    console.log("X-Ratelimit-Reset:", res.headers.get("X-Ratelimit-Reset"));

    const data = await res.json();
    console.log("返回数据:", data);

    return data;
  } catch (err) {
    console.error("请求失败:", err);
  }
})();
```

注意：

```txt
credentials 必须使用 omit
```

不要使用：

```txt
credentials: "include"
```

因为当前接口不需要 Cookie，也不依赖登录态。

---

## 九、curl 测试

```bash
curl -X POST "https://wechat-batch.hanj1998.workers.dev/api/extract" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你的_API_TOKEN" \
  -H "Idempotency-Key: test-001" \
  -d '{"url":"https://mp.weixin.qq.com/s/W0QrnWEILeJu-Nmdpr5zFw"}'
```

---

## 十、Cloudflare 需要配置的变量

### 1. Secret 变量

在 Cloudflare Worker 中添加 Secret：

```txt
API_TOKEN
```

值示例：

```txt
wechat_extract_一串随机字符串
```

建议使用长随机字符串，不要使用过短 token。

---

### 2. KV 绑定

需要创建并绑定两个 KV Namespace。

#### RATE_LIMIT_KV

用途：记录 IP 请求次数，实现限流。

绑定名必须是：

```txt
RATE_LIMIT_KV
```

#### IDEMPOTENCY_KV

用途：缓存相同 `Idempotency-Key` 的请求结果。

绑定名必须是：

```txt
IDEMPOTENCY_KV
```

---

## 十一、Cloudflare 后台配置步骤

### 1. 创建 KV

进入：

```txt
Workers & Pages
→ KV
→ Create namespace
```

创建：

```txt
RATE_LIMIT_KV
```

再创建：

```txt
IDEMPOTENCY_KV
```

---

### 2. 绑定 KV 到 Worker

进入：

```txt
Workers & Pages
→ wechat-batch
→ Settings
→ Bindings
→ Add
→ KV namespace
```

添加：

```txt
Variable name: RATE_LIMIT_KV
KV namespace: RATE_LIMIT_KV
```

再添加：

```txt
Variable name: IDEMPOTENCY_KV
KV namespace: IDEMPOTENCY_KV
```

---

### 3. 添加 Token

进入：

```txt
Workers & Pages
→ wechat-batch
→ Settings
→ Variables and Secrets
→ Add
```

添加 Secret：

```txt
Variable name: API_TOKEN
Value: 你的 token
```

建议选择加密保存。

---

### 4. 部署代码

进入：

```txt
Workers & Pages
→ wechat-batch
→ Edit code
```

粘贴下方完整代码，然后点击：

```txt
Save and deploy
```

---

# 十二、完整 Worker 代码

```js
const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");

  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,Idempotency-Key",
    "Access-Control-Expose-Headers":
      "Content-Length,X-Request-Id,X-Ratelimit-Limit,X-Ratelimit-Remaining,X-Ratelimit-Reset",
    "Vary": "Origin"
  };
}

function makeRequestId() {
  return crypto.randomUUID();
}

function checkToken(request, env) {
  const auth = request.headers.get("Authorization") || "";

  const tokenFromHeader = auth.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : "";

  const tokenFromQuery = new URL(request.url).searchParams.get("token") || "";

  const inputToken = tokenFromHeader || tokenFromQuery;

  if (!env.API_TOKEN) {
    return {
      ok: false,
      code: "TOKEN_NOT_CONFIGURED",
      message: "服务端未配置 API_TOKEN"
    };
  }

  if (!inputToken) {
    return {
      ok: false,
      code: "TOKEN_REQUIRED",
      message: "缺少访问 token"
    };
  }

  if (inputToken !== env.API_TOKEN) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      message: "token 不正确"
    };
  }

  return {
    ok: true
  };
}

function validateWechatUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== "string") {
    throw new Error("url 必须是字符串");
  }

  let parsed;

  try {
    parsed = new URL(inputUrl);
  } catch {
    throw new Error("url 格式不正确");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("只支持 http 或 https 链接");
  }

  if (parsed.hostname !== "mp.weixin.qq.com") {
    throw new Error("当前接口只允许解析 mp.weixin.qq.com 链接");
  }

  return parsed.toString();
}

function normalizeImageUrl(url) {
  if (!url) return null;

  let value = String(url).trim();

  if (!value) return null;

  if (value.startsWith("//")) {
    value = "https:" + value;
  }

  if (value.startsWith("http://")) {
    value = value.replace("http://", "https://");
  }

  return value;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function decodeHtml(str) {
  if (!str) return "";

  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function pickMeta(html, name) {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
}

function extractTitle(html) {
  const ogTitle = pickMeta(html, "og:title");

  if (ogTitle) {
    return ogTitle;
  }

  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  if (match?.[1]) {
    return decodeHtml(match[1].trim());
  }

  return "";
}

function extractImages(html) {
  const images = [];

  const ogImage = pickMeta(html, "og:image");
  const twitterImage = pickMeta(html, "twitter:image");

  if (ogImage) {
    images.push(normalizeImageUrl(ogImage));
  }

  if (twitterImage) {
    images.push(normalizeImageUrl(twitterImage));
  }

  const imgTagRegex = /<img\b[^>]*>/gi;
  const attrRegex =
    /\b(data-src|src|data-original|data-backsrc|data-lazyload)=["']([^"']+)["']/gi;

  let imgMatch;

  while ((imgMatch = imgTagRegex.exec(html)) !== null) {
    const tag = imgMatch[0];

    let attrMatch;

    attrRegex.lastIndex = 0;

    while ((attrMatch = attrRegex.exec(tag)) !== null) {
      const imageUrl = normalizeImageUrl(attrMatch[2]);

      if (
        imageUrl &&
        (
          imageUrl.includes("mmbiz.qpic.cn") ||
          imageUrl.includes("mmbiz.qlogo.cn")
        )
      ) {
        images.push(imageUrl);
      }
    }
  }

  const dataSrcRegex = /data-src=["']([^"']+)["']/gi;

  let dataSrcMatch;

  while ((dataSrcMatch = dataSrcRegex.exec(html)) !== null) {
    const imageUrl = normalizeImageUrl(dataSrcMatch[1]);

    if (
      imageUrl &&
      (
        imageUrl.includes("mmbiz.qpic.cn") ||
        imageUrl.includes("mmbiz.qlogo.cn")
      )
    ) {
      images.push(imageUrl);
    }
  }

  return unique(images);
}

async function checkRateLimit(request, env) {
  if (!env.RATE_LIMIT_KV) {
    return {
      allowed: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT - 1,
      reset: Math.floor(Date.now() / 1000) + RATE_WINDOW_SECONDS
    };
  }

  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  const key = `rate:${ip}`;
  const now = Math.floor(Date.now() / 1000);

  let record = {
    count: 0,
    reset: now + RATE_WINDOW_SECONDS
  };

  const old = await env.RATE_LIMIT_KV.get(key, "json");

  if (old && old.reset > now) {
    record = old;
  }

  if (record.reset <= now) {
    record = {
      count: 0,
      reset: now + RATE_WINDOW_SECONDS
    };
  }

  record.count += 1;

  await env.RATE_LIMIT_KV.put(key, JSON.stringify(record), {
    expirationTtl: RATE_WINDOW_SECONDS
  });

  const remaining = Math.max(0, RATE_LIMIT - record.count);

  return {
    allowed: record.count <= RATE_LIMIT,
    limit: RATE_LIMIT,
    remaining,
    reset: record.reset
  };
}

async function handleExtract(request, env, ctx) {
  const requestId = makeRequestId();

  const corsHeaders = getCorsHeaders(request);

  const rate = await checkRateLimit(request, env);

  const commonHeaders = {
    ...corsHeaders,
    "X-Request-Id": requestId,
    "X-Ratelimit-Limit": String(rate.limit),
    "X-Ratelimit-Remaining": String(rate.remaining),
    "X-Ratelimit-Reset": String(rate.reset)
  };

  const tokenCheck = checkToken(request, env);

  if (!tokenCheck.ok) {
    return jsonResponse(
      {
        ok: false,
        code: tokenCheck.code,
        message: tokenCheck.message,
        requestId
      },
      tokenCheck.code === "TOKEN_NOT_CONFIGURED" ? 500 : 401,
      commonHeaders
    );
  }

  if (!rate.allowed) {
    return jsonResponse(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: "请求过于频繁，请稍后再试",
        requestId
      },
      429,
      commonHeaders
    );
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");

  if (idempotencyKey && env.IDEMPOTENCY_KV) {
    const cached = await env.IDEMPOTENCY_KV.get(
      `idem:${idempotencyKey}`,
      "json"
    );

    if (cached) {
      return jsonResponse(cached, 200, commonHeaders);
    }
  }

  try {
    const body = await request.json();

    const url = validateWechatUrl(body.url);

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
      },
      redirect: "follow"
    });

    if (!upstream.ok) {
      return jsonResponse(
        {
          ok: false,
          code: "UPSTREAM_ERROR",
          message: `微信文章请求失败，状态码：${upstream.status}`,
          requestId
        },
        502,
        commonHeaders
      );
    }

    const html = await upstream.text();

    const title = extractTitle(html);

    const description =
      pickMeta(html, "og:description") ||
      pickMeta(html, "description");

    const images = extractImages(html);

    const result = {
      ok: true,
      requestId,
      sourceUrl: url,
      title,
      description,
      count: images.length,
      images
    };

    if (idempotencyKey && env.IDEMPOTENCY_KV) {
      ctx.waitUntil(
        env.IDEMPOTENCY_KV.put(
          `idem:${idempotencyKey}`,
          JSON.stringify(result),
          {
            expirationTtl: 300
          }
        )
      );
    }

    return jsonResponse(result, 200, commonHeaders);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        code: "BAD_REQUEST",
        message: error.message || "请求参数错误",
        requestId
      },
      400,
      commonHeaders
    );
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const corsHeaders = getCorsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return jsonResponse(
        {
          ok: true,
          service: "wechat-image-extract",
          time: new Date().toISOString()
        },
        200,
        corsHeaders
      );
    }

    if (url.pathname === "/api/extract" && request.method === "POST") {
      return handleExtract(request, env, ctx);
    }

    return jsonResponse(
      {
        ok: false,
        code: "NOT_FOUND",
        message: "接口不存在"
      },
      404,
      corsHeaders
    );
  }
};
```

---

## 十三、注意事项

### 1. 不要把 token 写进公开前端源码

如果 token 写在前端页面里，别人可以通过浏览器 DevTools 看到。

适合的使用方式：

```txt
自己控制台测试
低风险内部工具
后端服务之间调用
```

不适合：

```txt
公开网页中直接暴露 token
```

---

### 2. 为什么浏览器会出现 204？

浏览器跨域请求时，如果带了 `Authorization` 或 `Content-Type: application/json`，会先发送一个 `OPTIONS` 预检请求。

所以你会看到：

```txt
204 OPTIONS
200 POST
```

这是正常的。

---

### 3. 为什么 count 可能是 0？

如果返回：

```json
{
  "ok": true,
  "count": 0,
  "images": []
}
```

说明接口本身跑通了，但没有提取到图片。

可能原因：

```txt
文章 HTML 中图片字段变化
微信返回了特殊页面
文章需要登录或验证
微信侧反爬
```

---

### 4. 为什么国内访问 Cloudflare 不稳定？

Cloudflare Workers 在国内部分网络环境访问可能不稳定。如果面向国内用户，后续可以迁移到：

```txt
阿里云函数计算 FC
腾讯云云函数 SCF
腾讯云 EdgeOne Edge Functions
```

---

## 十四、推荐正式部署策略

开发阶段：

```txt
Cloudflare Worker
允许任意 Origin
Bearer Token
KV 限流
```

正式上线阶段：

```txt
国内云函数
自定义域名
HTTPS
Bearer Token
CORS 白名单
更严格限流
日志记录
```

