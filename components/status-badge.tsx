import { Badge } from "@/components/ui/badge";
import { orderStatusLabels, type OrderStatus } from "@/types/domain";

const toneByStatus: Record<OrderStatus, "neutral" | "green" | "amber" | "red" | "blue"> = {
  new_request: "blue",
  measurements: "neutral",
  awaiting_prepayment: "amber",
  purchasing_materials: "amber",
  sewing: "blue",
  fitting: "blue",
  alterations: "amber",
  ready: "green",
  delivered: "green",
  cancelled: "red"
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={toneByStatus[status]}>{orderStatusLabels[status] ?? status}</Badge>;
}
