type TrendPoint = {
  x?: number;
  y?: number;
  value?: number | null;
};

type GraphicalItem = {
  item?: {
    props?: {
      dataKey?: string;
      stroke?: string;
      strokeDasharray?: string;
      strokeWidth?: number;
    };
  };
  props?: {
    dataKey?: string;
    points?: TrendPoint[];
    stroke?: string;
    strokeDasharray?: string;
    strokeWidth?: number;
  };
};

type DirectionalTrendOverlayProps = {
  formattedGraphicalItems?: GraphicalItem[];
  strokeOpacity?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function renderSegments({
  keyPrefix,
  points,
  stroke,
  strokeOpacity,
  strokeWidth,
}: {
  keyPrefix: string;
  points: TrendPoint[];
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
}) {
  if (points.length < 2) {
    return null;
  }

  return points.slice(1).map((currentPoint, index) => {
    const previousPoint = points[index];

    if (
      !isFiniteNumber(previousPoint?.x) ||
      !isFiniteNumber(previousPoint?.y) ||
      !isFiniteNumber(currentPoint?.x) ||
      !isFiniteNumber(currentPoint?.y)
    ) {
      return null;
    }

    const previousValue = previousPoint.value;
    const currentValue = currentPoint.value;

    if (previousValue == null || currentValue == null) {
      return null;
    }

    const isDownward = currentValue < previousValue;

    return (
      <line
        key={`${keyPrefix}-${index}-${previousPoint.x}-${previousPoint.y}-${currentPoint.x}-${currentPoint.y}`}
        x1={previousPoint.x}
        x2={currentPoint.x}
        y1={previousPoint.y}
        y2={currentPoint.y}
        stroke={stroke}
        strokeDasharray={isDownward ? "6 5" : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  });
}

export function DirectionalTrendOverlay({
  formattedGraphicalItems = [],
  strokeOpacity = 1,
}: DirectionalTrendOverlayProps) {
  if (!formattedGraphicalItems.length) {
    return null;
  }

  return (
    <g pointerEvents="none">
      {formattedGraphicalItems.flatMap((item, index) => {
        const dataKey = item.item?.props?.dataKey ?? item.props?.dataKey;
        const strokeDasharray = item.item?.props?.strokeDasharray ?? item.props?.strokeDasharray;
        if (dataKey === "trendValue" || strokeDasharray) {
          return [];
        }

        const points = item.props?.points ?? [];
        const stroke = item.item?.props?.stroke ?? item.props?.stroke ?? "#0f172a";
        const strokeWidth = item.item?.props?.strokeWidth ?? item.props?.strokeWidth ?? 2;
        return renderSegments({
          keyPrefix: `trend-${index}`,
          points,
          stroke,
          strokeOpacity,
          strokeWidth,
        }) ?? [];
      })}
    </g>
  );
}
