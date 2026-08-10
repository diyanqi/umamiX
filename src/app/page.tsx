import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  FileBarChart,
  GitBranch,
  Globe2,
  Layers,
  Lock,
  Radio,
  ShieldCheck,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Lock,
    title: "Privacy-first",
    text: "无 Cookie、无指纹、默认遵守 GDPR。访客数据去标识化，只在你的实例内处理。",
  },
  {
    icon: Zap,
    title: "轻量 SDK",
    text: "20KB 级追踪脚本，Proof-of-Work 防滥用，一行代码接入任意静态站点。",
  },
  {
    icon: Layers,
    title: "多租户 SaaS",
    text: "单应用、单数据库、逻辑租户隔离。每个项目都有 tenant、user、project 三层边界。",
  },
  {
    icon: Bot,
    title: "AI 洞察",
    text: "OpenAI 兼容接口驱动流量总结、异常归因、周报与转化分析。",
  },
  {
    icon: FileBarChart,
    title: "高级报告",
    text: "漏斗、留存、UTM、用户旅程与归因报告，全部在仪表盘内直接生成。",
  },
  {
    icon: Radio,
    title: "事件分析",
    text: "自定义事件、属性、目标与转化跟踪，配合实时聚合队列横向扩展。",
  },
];

const faqs = [
  {
    q: "和 Umami Cloud 有什么区别？",
    a: "我们提供更便宜的订阅、更开放的 API、AI 洞察与微信通知，同时保持隐私优先和可自托管。",
  },
  {
    q: "追踪脚本会收集个人信息吗？",
    a: "不会。脚本不写 Cookie、不做指纹识别，只发送访问路径、来源与设备等匿名维度。",
  },
  {
    q: "数据存储在哪里？",
    a: "自托管部署时数据只存在你自己的 PostgreSQL 中。SaaS 版本按租户逻辑隔离。",
  },
  {
    q: "如何部署到自己的 VPS？",
    a: "仓库提供 Docker Compose，包含 Next.js、PostgreSQL、Redis 与聚合 Worker 四个服务。",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <a href="/" className="flex items-baseline gap-2">
            <span className="text-lg font-bold">无尽分析</span>
            <span className="text-xs font-medium text-muted-foreground">Infvar Analytics</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">功能</a>
            <a href="#privacy" className="hover:text-foreground">隐私</a>
            <a href="#pricing" className="hover:text-foreground">定价</a>
            <a href="#docs" className="hover:text-foreground">文档</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="/signin" className="text-sm font-medium hover:text-primary">登录</a>
            <a
              href="/signin"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              开始使用
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#101613] text-white">
        <div className="landing-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 md:pt-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/75">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              隐私优先 · 多租户 · 可自托管
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              无尽分析
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/70 sm:text-xl">
              比 Umami Cloud 更便宜、更开放、更适合开发者的隐私分析平台。
              一个脚本，获取实时流量、事件、漏斗与 AI 洞察。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="/signin"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-[#101613] hover:bg-white/90"
              >
                创建免费项目 <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#pricing"
                className="inline-flex h-11 items-center rounded-md border border-white/20 px-6 text-sm font-medium text-white hover:bg-white/10"
              >
                查看定价
              </a>
            </div>
          </div>

          <div className="hero-preview mt-16 overflow-hidden rounded-xl border border-white/10 bg-[#0c1116]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                analytics.infvar.com/dashboard
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
              </div>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr]">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/50">最近 30 天</p>
                    <p className="mt-1 text-2xl font-semibold">128,430 <span className="text-sm text-emerald-300">+12.8%</span></p>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/70">页面浏览</span>
                    <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-white/70">访客</span>
                  </div>
                </div>
                <div className="flex h-40 items-end gap-1.5">
                      {[34, 48, 41, 62, 55, 70, 66, 82, 74, 96, 88, 108, 101, 124, 116, 132, 126, 140, 135, 158, 148, 170, 162, 185, 176, 192, 184, 201, 194, 214].map((height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-sm bg-emerald-400/70"
                          style={{ height: `${Math.round((height / 220) * 100)}%` }}
                        />
                      ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] text-white/50">访客</p>
                    <p className="mt-1 text-xl font-semibold">86,204</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] text-white/50">跳出率</p>
                    <p className="mt-1 text-xl font-semibold">38.2%</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] text-white/50">来源</p>
                    <p className="mt-1 text-xl font-semibold">1,842</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-[10px] text-white/50">事件</p>
                    <p className="mt-1 text-xl font-semibold">42.1k</p>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-2 text-[10px] text-white/50">热门页面</p>
                  {["/", "/docs/quickstart", "/pricing", "/blog/privacy", "/guide/events"].map((page, index) => (
                    <div key={page} className="flex items-center gap-2 py-1 text-xs">
                      <span className="w-4 text-white/40">{index + 1}</span>
                      <span className="flex-1 truncate text-white/80">{page}</span>
                      <span className="text-white/50">{(34 - index * 3.8).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">功能</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">为开发者而生的完整分析平台</h2>
          <p className="mt-3 text-muted-foreground">
            不是 Umami 的部署包装。事件摄入、聚合队列、多租户数据模型、计划与配额都是独立实现。
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-lg border bg-card p-5">
              <feature.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="privacy" className="border-y bg-card py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-primary">隐私优势</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">不追踪访客，也能读懂访客</h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              无尽分析的设计原则是只收集回答业务问题所需的最少数据。默认不写 Cookie、不做浏览器指纹，所有原始事件保留期限都由订阅计划控制。
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["无 Cookie", "无指纹识别", "GDPR 友好", "租户隔离", "数据保留控制", "开源自托管"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-background p-6">
            <div className="flex items-center gap-2 border-b pb-4 text-xs text-muted-foreground">
              <Globe2 className="h-4 w-4" />
              script.js
            </div>
            <pre className="overflow-x-auto pt-4 text-xs leading-6 text-muted-foreground">
{`<script
  src="https://analytics.infvar.com/script.js"
  data-project-id="prj_xxx"
  data-website-id="web_xxx">
</script>

analytics.track("signup", {
  plan: "pro",
  source: "landing"
});`}
            </pre>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-between border-b py-2">
                <span>脚本体积</span>
                <span className="font-medium">约 20KB</span>
              </div>
              <div className="flex items-center justify-between border-b py-2">
                <span>默认 Cookie</span>
                <span className="font-medium text-primary">0</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>追踪端点</span>
                <span className="font-medium">POST /api/track</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-2xl font-bold tracking-tight">与传统分析工具对比</h2>
        <div className="mt-8 overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[45rem] text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-4 font-medium text-muted-foreground">能力</th>
                <th className="p-4 font-semibold">无尽分析</th>
                <th className="p-4 font-medium">Umami Cloud</th>
                <th className="p-4 font-medium">GA4</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ["无 Cookie 追踪", true, true, false],
                ["自托管", true, false, false],
                ["AI 洞察", true, false, true],
                ["高级报告", true, true, true],
                ["API 访问", true, true, false],
                ["微信通知", true, false, false],
                ["低成本订阅", true, false, false],
              ].map(([label, infvar, umami, ga4]) => (
                <tr key={String(label)} className="border-b last:border-0">
                  <td className="p-4 text-foreground">{String(label)}</td>
                  <td className="p-4">{infvar ? <Check className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground/40">—</span>}</td>
                  <td className="p-4">{umami ? <Check className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground/40">—</span>}</td>
                  <td className="p-4">{ga4 ? <Check className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground/40">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="pricing" className="border-y bg-card py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">定价</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">比 Umami Cloud 便宜</h2>
            <p className="mt-3 text-muted-foreground">免费计划支持个人项目，付费计划按功能与配额解锁。</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "¥0",
                period: "/ 月",
                desc: "个人开发者",
                items: ["3 个网站", "30 天数据保留", "基础事件", "2 个标准报告"],
              },
              {
                name: "Pro",
                price: "¥29",
                period: "/ 月",
                desc: "开发者与小团队",
                items: ["50 个网站", "180 天数据保留", "API 访问", "高级报告", "AI 洞察"],
                highlight: true,
              },
              {
                name: "Business",
                price: "¥99",
                period: "/ 月",
                desc: "成长型公司",
                items: ["无限网站", "团队与权限", "365 天数据保留", "优先资源", "更大配额"],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={plan.highlight
                  ? "relative rounded-lg border-2 border-primary bg-background p-6"
                  : "rounded-lg border bg-background p-6"}
              >
                {plan.highlight ? (
                  <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    最受欢迎
                  </span>
                ) : null}
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{plan.desc}</p>
                <p className="mt-5 text-3xl font-bold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="/signin"
                  className={`mt-7 flex h-10 items-center justify-center rounded-md text-sm font-medium ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-input hover:bg-muted"
                  }`}
                >
                  选择 {plan.name}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="docs" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-primary">文档</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">五分钟接入</h2>
            <ol className="mt-6 space-y-4 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">1</span>
                使用 GitHub 登录并创建项目
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">2</span>
                添加网站并复制追踪脚本
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">3</span>
                在仪表盘查看实时数据与 AI 洞察
              </li>
            </ol>
            <a href="/signin" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary">
              进入控制台 <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <div className="rounded-lg border bg-[#101613] p-6 text-white">
            <div className="mb-4 flex items-center gap-2 text-xs text-white/60">
              <GitBranch className="h-4 w-4" />
              docker compose up
            </div>
            <pre className="overflow-x-auto text-xs leading-6 text-white/75">
{`services:
  web:       # Next.js + API
  postgres:  # PostgreSQL 16
  redis:     # Queue + rate limits
  worker:    # Aggregation worker`}
            </pre>
            <p className="mt-5 text-sm leading-6 text-white/60">
              事件摄入走队列，聚合 Worker 落库，支持未来横向扩容。
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t bg-card py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-bold tracking-tight">常见问题</h2>
          <div className="mt-8 space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group rounded-lg border bg-background p-4">
                <summary className="cursor-pointer list-none text-sm font-medium">
                  {faq.q}
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-xl bg-[#101613] px-6 py-14 text-center text-white">
          <BarChart3 className="mx-auto h-8 w-8 text-emerald-300" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight">开始你的隐私分析</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/65">
            免费创建项目，接入第一个网站，5 分钟内看到真实流量。
          </p>
          <a
            href="/signin"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-white px-6 text-sm font-semibold text-[#101613] hover:bg-white/90"
          >
            免费开始 <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-foreground">无尽分析</span>
            <span>Infvar Analytics</span>
          </div>
          <div className="flex gap-5">
            <a href="#privacy" className="hover:text-foreground">隐私</a>
            <a href="#pricing" className="hover:text-foreground">定价</a>
            <a href="/signin" className="hover:text-foreground">登录</a>
          </div>
          <p>© 2026 Infvar</p>
        </div>
      </footer>
    </main>
  );
}
