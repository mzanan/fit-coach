import {
  BODY_SEGMENTS,
  SEGMENT_METRICS,
  type Segmental,
} from "@/lib/constants";

export function SegmentalTable({ data }: { data: Segmental }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-meta">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 text-left font-medium">Segment</th>
            {SEGMENT_METRICS.map((m) => (
              <th key={m.key} className="py-1 text-right font-medium">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BODY_SEGMENTS.map((segment) => (
            <tr key={segment.key} className="border-t border-border">
              <td className="py-1">{segment.label}</td>
              {SEGMENT_METRICS.map((m) => (
                <td key={m.key} className="num py-1 text-right">
                  {data[segment.key]?.[m.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
