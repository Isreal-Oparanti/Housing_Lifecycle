import type { Metadata } from "next";
import { HomesPage } from "@/components/homes/HomesPage";

export const metadata: Metadata = {
  title: "Your homes · TrueCost",
  description: "Your saved homes, ranked by what they really cost each month.",
};

export default function Homes() {
  return <HomesPage />;
}
