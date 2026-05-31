import { createFileRoute } from "@tanstack/react-router";
import { ReportLayout } from "@/components/report/ReportLayout";

export const Route = createFileRoute("/report")({
  head: () => ({ meta: [{ title: "Underwriting Report — RMH.BSA" }] }),
  component: ReportLayout,
});
