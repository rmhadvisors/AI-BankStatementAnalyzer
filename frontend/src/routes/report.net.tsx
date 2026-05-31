import { createFileRoute } from "@tanstack/react-router";
import { RawSheet } from "@/components/report/RawSheet";
import { Panel } from "@/components/report/primitives";
import { SectionHead } from "@/components/report/SectionHead";
import { ModuleExcelButton } from "@/components/report/ModuleExcelButton";
import { NetPositionPeriodChart } from "@/components/report/PeriodCharts";
import { useScopedReport } from "@/hooks/useScopedReport";

export const Route = createFileRoute("/report/net")({ component: Page });
function Page() {
  const { momSummary, labels, dailyFlow, monthLabel } = useScopedReport();

  return (
    <div className="space-y-6">
      <SectionHead
        code="14"
        title="Net Transactions"
        subtitle={labels.isMonthly ? `Daily net position · ${monthLabel}` : "Monthly net position — surplus (green) vs deficit (red)."}
        action={<ModuleExcelButton module="net-transactions" />}
      />
      <Panel title={labels.isMonthly ? "Net by day" : "Net position by month"}>
        <NetPositionPeriodChart
          isMonthly={labels.isMonthly}
          monthLabel={monthLabel}
          momRows={momSummary}
          dailyFlow={dailyFlow}
        />
      </Panel>
      <RawSheet name="Net Transactions" />
    </div>
  );
}
