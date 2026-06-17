"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTranslations } from "@/components/i18n-provider";
import type { E2EPersonaKey, E2EScenarioKey, E2ETestCaseKey } from "@/lib/test-auth/personas";

type PersonaOption = {
  avatarUrl: string;
  displayName: string;
  email: string;
  friendCode: string;
  key: E2EPersonaKey;
};

type TestCaseOption = {
  description: string;
  destination: string;
  key: E2ETestCaseKey;
  persona: PersonaOption;
  scenario: E2EScenarioKey;
  title: string;
};

type TestAuthPanelProps = {
  hasServiceRole: boolean;
  testCases: TestCaseOption[];
};

type RequestState = {
  message: string;
  status: "idle" | "loading" | "success" | "error";
};

async function postTestAuth(path: string, secret: string, body: Record<string, string>) {
  const response = await fetch(path, {
    body: JSON.stringify(body),
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-e2e-test-auth-secret": secret,
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => ({}))) as { message?: string; next?: string };

  if (!response.ok) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }

  return payload;
}

export function TestAuthPanel({ hasServiceRole, testCases }: TestAuthPanelProps) {
  const t = useTranslations();
  const [secret, setSecret] = useState("");
  const [testCaseKey, setTestCaseKey] = useState<E2ETestCaseKey>(testCases[0]?.key ?? "dashboard-rich-alice");
  const [requestState, setRequestState] = useState<RequestState>({ message: "", status: "idle" });

  const selectedTestCase = testCases.find((option) => option.key === testCaseKey) ?? testCases[0];
  const isBusy = requestState.status === "loading";
  const canSubmit = hasServiceRole && Boolean(secret) && Boolean(selectedTestCase) && !isBusy;

  async function handleStartTestCase() {
    if (!selectedTestCase) {
      return;
    }

    setRequestState({ message: t("testAuth.status.resetting"), status: "loading" });

    try {
      await postTestAuth("/api/test-auth/reset", secret, { scenario: selectedTestCase.scenario });
      setRequestState({ message: t("testAuth.status.loggingIn"), status: "loading" });
      const payload = await postTestAuth("/api/test-auth/login", secret, {
        next: selectedTestCase.destination,
        persona: selectedTestCase.persona.key,
      });
      setRequestState({ message: t("testAuth.status.loginSuccess"), status: "success" });
      window.location.assign(payload.next || selectedTestCase.destination);
    } catch (error) {
      setRequestState({
        message: error instanceof Error ? error.message : t("testAuth.status.failed"),
        status: "error",
      });
    }
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("testAuth.eyebrow")}
          </p>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
              {t("testAuth.title")}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">{t("testAuth.description")}</p>
          </div>
        </section>

        {!hasServiceRole ? (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {t("testAuth.missingServiceRole")}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <Card className="rounded-2xl p-5">
            <div className="space-y-5">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">{t("testAuth.secretLabel")}</span>
                <Input
                  autoComplete="off"
                  onChange={(event) => setSecret(event.target.value)}
                  placeholder={t("testAuth.secretPlaceholder")}
                  type="password"
                  value={secret}
                />
              </label>

              <div className="grid gap-2">
                <span className="text-sm font-semibold text-foreground">{t("testAuth.caseLabel")}</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {testCases.map((option) => (
                    <button
                      className={`min-h-11 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        option.key === testCaseKey
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card/70 text-muted-foreground hover:border-accent/60"
                      }`}
                      key={option.key}
                      onClick={() => setTestCaseKey(option.key)}
                      type="button"
                    >
                      <span className="flex items-start gap-3">
                        <UserAvatar
                          avatarUrl={option.persona.avatarUrl}
                          className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card"
                          fallbackClassName="text-sm font-semibold text-foreground"
                          name={option.persona.displayName}
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground">{option.title}</span>
                          <span className="mt-1 block leading-5">{option.description}</span>
                        </span>
                      </span>
                      <span className="mt-2 block text-xs font-semibold text-muted-foreground">
                        {t("testAuth.caseMeta", {
                          destination: option.destination,
                          persona: option.persona.displayName,
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button disabled={!canSubmit} onClick={handleStartTestCase} type="button">
                  {t("testAuth.startCase")}
                </Button>
              </div>

              {requestState.message ? (
                <p
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    requestState.status === "error"
                      ? "bg-danger/10 text-danger"
                      : "bg-accent/10 text-accent-foreground"
                  }`}
                >
                  {requestState.message}
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <div className="space-y-5">
              {selectedTestCase ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      avatarUrl={selectedTestCase.persona.avatarUrl}
                      className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card"
                      fallbackClassName="text-base font-semibold text-foreground"
                      name={selectedTestCase.persona.displayName}
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-semibold text-foreground">{t("testAuth.selectedCase")}</span>
                      <h2 className="text-xl font-semibold text-foreground">{selectedTestCase.title}</h2>
                      <p className="text-sm leading-6 text-muted-foreground">{selectedTestCase.description}</p>
                    </div>
                  </div>

                  <dl className="grid gap-3 text-sm">
                    <div className="rounded-2xl bg-muted/30 px-4 py-3">
                      <dt className="font-semibold text-muted-foreground">{t("testAuth.seedScenario")}</dt>
                      <dd className="mt-1 text-foreground">{selectedTestCase.scenario}</dd>
                    </div>
                    <div className="rounded-2xl bg-muted/30 px-4 py-3">
                      <dt className="font-semibold text-muted-foreground">{t("testAuth.loginPerspective")}</dt>
                      <dd className="mt-1 text-foreground">{selectedTestCase.persona.displayName}</dd>
                      <dd className="mt-1 text-xs text-muted-foreground">{selectedTestCase.persona.email}</dd>
                    </div>
                    <div className="rounded-2xl bg-muted/30 px-4 py-3">
                      <dt className="font-semibold text-muted-foreground">{t("testAuth.destinationLabel")}</dt>
                      <dd className="mt-1 text-foreground">{selectedTestCase.destination}</dd>
                    </div>
                    <div className="rounded-2xl bg-muted/30 px-4 py-3">
                      <dt className="font-semibold text-muted-foreground">{t("testAuth.friendCodeLabel")}</dt>
                      <dd className="mt-1 text-foreground">{selectedTestCase.persona.friendCode}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
