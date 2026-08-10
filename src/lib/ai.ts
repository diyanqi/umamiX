export type InsightInput = {
  websiteName: string;
  days: number;
  pageviews: number;
  visitors: number;
  sessions: number;
  bounceRate: number;
  topPages: Array<{ path: string; count: number }>;
};

export async function generateInsights(input: InsightInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI provider is not configured");
  }

  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You are the analytics assistant for Infvar Analytics, a privacy-first analytics platform. Write concise, actionable Chinese insights for a website owner. Keep it under 300 words and use concrete numbers.",
        },
        {
          role: "user",
          content: `Website: ${input.websiteName}\nPeriod: last ${input.days} days\nPageviews: ${input.pageviews}\nVisitors: ${input.visitors}\nSessions: ${input.sessions}\nBounce rate: ${input.bounceRate}%\nTop pages:\n${input.topPages
            .slice(0, 10)
            .map((page) => `- ${page.path} (${page.count})`)
            .join("\n")}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI provider error: ${response.status} ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "No insights generated.";
}
