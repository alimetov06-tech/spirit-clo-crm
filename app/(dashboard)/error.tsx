"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Не удалось открыть CRM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-graphite/70">
            Сессия входа есть, но сервер не смог загрузить данные рабочего пространства. Обновите страницу или войдите заново.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => reset()}>
              Обновить
            </Button>
            <Link href="/login">
              <Button variant="secondary">Ко входу</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
