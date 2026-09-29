"use client";

import Link from "next/link";
import { ArrowUpRight, Gauge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MASTER_DATA_GROUP, visibleNavGroups } from "@/components/layout/nav-config";
import { useAuth } from "@/providers/auth-provider";

export function DashboardView() {
  const { user, roles, permissions } = useAuth();
  const masters = visibleNavGroups(permissions).find((g) => g.label === MASTER_DATA_GROUP)?.items ?? [];

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl bg-sidebar p-6 text-white shadow-raised sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_16rem_at_0%_0%,oklch(0.5_0.22_277/0.45),transparent_65%),radial-gradient(24rem_14rem_at_100%_100%,oklch(0.45_0.15_250/0.3),transparent_60%)]"
        />
        <div className="relative">
          <p className="text-xs font-medium tracking-[0.08em] text-white/60 uppercase">Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-white/70">
            {roles.length > 0 ? `Signed in as ${roles.join(", ")}` : "No role assigned"}
          </p>
        </div>
      </section>

      <section aria-labelledby="master-data-heading" className="flex flex-col gap-3">
        <div>
          <h2 id="master-data-heading" className="text-base font-semibold tracking-tight">
            Master data
          </h2>
          <p className="text-sm text-muted-foreground">Reference records you have access to.</p>
        </div>
        {masters.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your role does not include access to any master data yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {masters.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl bg-card p-4 shadow-card ring-1 ring-foreground/8 outline-none transition-all duration-150 hover:-translate-y-px hover:shadow-raised hover:ring-brand/30 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand-soft text-brand ring-1 ring-brand/10 transition-colors group-hover:bg-brand group-hover:text-white">
                    <item.icon aria-hidden className="size-5" strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
              <Gauge aria-hidden className="size-5" />
            </span>
            <div>
              <CardTitle>Operational dashboard</CardTitle>
              <CardDescription className="mt-1">
                Orders, materials, production, quality and dispatch indicators will appear here as
                those modules are added. Nothing is shown until real data exists.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </>
  );
}
