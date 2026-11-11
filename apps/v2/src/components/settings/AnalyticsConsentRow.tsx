"use client";

import { Cookie } from "lucide-react";

import { ListGroup, ListRow } from "@/components/ui/ListRow";
import { useAnalyticsConsent } from "@/hooks/useAnalyticsConsent";

export function AnalyticsConsentRow() {
  const { status, accept, decline } = useAnalyticsConsent();

  if (status === null) return null;

  const granted = status === "granted";

  return (
    <ListGroup>
      <ListRow
        icon={Cookie}
        label="Analytics cookies"
        value={granted ? "On" : "Off"}
        chevron={false}
        onClick={granted ? decline : accept}
      />
    </ListGroup>
  );
}
