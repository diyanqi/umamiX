import type { Metadata } from "next";
import { Suspense } from "react";
import { CapSignIn } from "@/components/auth/cap-signin";

export const metadata: Metadata = {
  title: "登录",
};

export default function SignInPage() {
  return (
    <main className="landing-grid flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <a href="/" className="inline-flex items-baseline gap-2 text-xl font-bold">
            无尽分析
            <span className="text-sm font-medium text-muted-foreground">Infvar Analytics</span>
          </a>
        </div>
        <Suspense fallback={null}>
          <CapSignIn />
        </Suspense>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/" className="hover:text-foreground">返回首页</a>
        </p>
      </div>
    </main>
  );
}
