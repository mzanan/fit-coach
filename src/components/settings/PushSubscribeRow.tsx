"use client";

import { Bell } from "lucide-react";

import { usePushSubscription } from "@/components/settings/usePushSubscription";
import { ListGroup, ListRow } from "@/components/ui/ListRow";

export function PushSubscribeRow() {
  const { supported, subscribed, pending, subscribe, unsubscribe } =
    usePushSubscription();

  if (!supported) return null;

  return (
    <ListGroup label="Notifications" enterIndex={4}>
      <ListRow
        icon={Bell}
        label="Push notifications"
        value={subscribed ? "On" : "Off"}
        pending={pending}
        disabled={pending}
        chevron={false}
        onClick={() => void (subscribed ? unsubscribe() : subscribe())}
      />
    </ListGroup>
  );
}
