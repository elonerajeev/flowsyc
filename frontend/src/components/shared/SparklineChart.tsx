import { SimpleSparkline } from "@/components/shared/SimpleCharts";
import { cn } from "@/lib/utils";

type SparklineChartProps = {
  data: number[];
  stroke?: string;
  fill?: string;
  accentFill?: string;
  className?: string;
  height?: number;
};

export default function SparklineChart({
  data,
  stroke = "hsl(var(--primary))",
  fill = "hsl(var(--primary) / 0.18)",
  accentFill = "hsl(var(--accent) / 0.12)",
  className,
  height = 40,
}: SparklineChartProps) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <SimpleSparkline 
        data={data} 
        stroke={stroke} 
        fill={fill} 
        accentFill={accentFill} 
        className="h-full"
      />
    </div>
  );
}
