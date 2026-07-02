import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Card className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full border border-graphite/10 bg-linen/60 p-3">
        <Plus className="h-5 w-5 text-graphite" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-graphite/70">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-5">
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
    </Card>
  );
}
