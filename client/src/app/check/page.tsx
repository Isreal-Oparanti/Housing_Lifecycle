import type { Metadata } from "next";
import { CostReport } from "@/components/report/CostReport";
import { readCheckParams } from "@/lib/check";

export const metadata: Metadata = {
  title: "Your monthly cost · TrueCost",
};

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = readCheckParams(await searchParams);
  return <CostReport key={`${params.q}|${params.authority}`} initial={params} />;
}
