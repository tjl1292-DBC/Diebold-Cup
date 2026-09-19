import type { Metadata } from "next";
import { PageTitle } from "@/components/ui";
import { AskClient } from "./AskClient";

export const metadata: Metadata = { title: "Ask" };

export default function AskPage() {
  return (
    <>
      <PageTitle
        eyebrow="Question box"
        title="Ask the record"
        lede="Ask in plain English. The answer is built only from rows in the database, and those rows are shown underneath so you can check it."
      />
      <AskClient enabled={!!process.env.ANTHROPIC_API_KEY} />
    </>
  );
}
