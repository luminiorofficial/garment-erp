"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/page-header";
import { visibleNavGroups } from "@/components/layout/nav-config";
import { useAuth } from "@/providers/auth-provider";

export function DashboardView() {
  const { user, roles, permissions } = useAuth();
  const masters = visibleNavGroups(permissions).find((g) => g.label === "Masters")?.items ?? [];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? ""}`}
        description={roles.length > 0 ? `Signed in as ${roles.join(", ")}` : "No role assigned"}
      />

      <Card>
        <CardHeader>
          <CardTitle>Master data</CardTitle>
          <CardDescription>Reference records you have access to.</CardDescription>
        </CardHeader>
        <CardContent>
          {masters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your role does not include access to any master data yet.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {masters.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {item.label}
                    <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operational dashboard</CardTitle>
          <CardDescription>
            Orders, materials, production, quality and dispatch indicators will appear here as
            those modules are added. Nothing is shown until real data exists.
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}
