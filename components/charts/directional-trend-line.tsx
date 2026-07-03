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
  outlineStroke?: string;
  outlineStrokeOpacity?: number;
  outlineStrokeWidth?: number;
  strokeOpacity?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function renderSegments({
  keyPrefix,
  points,
  outlineStroke,
  outlineStrokeOpacity,
  outlineStrokeWidth,
  stroke,
  strokeOpacity,
  strokeWidth,
}: {
  keyPrefix: string;
  points: TrendPoint[];
  outlineStroke?: string;
  outlineStrokeOpacity: number;
  outlineStrokeWidth: number;
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

    const key = `${keyPrefix}-${index}-${previousPoint.x}-${previousPoint.y}-${currentPoint.x}-${currentPoint.y}`;
    const sharedProps = {
      x1: previousPoint.x,
      x2: currentPoint.x,
      y1: previousPoint.y,
      y2: currentPoint.y,
      strokeDasharray: isDownward ? "6 5" : undefined,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      vectorEffect: "non-scaling-stroke" as const,
    };

    return (
      <g key={key}>
        {outlineStroke ? (
          <line
            {...sharedProps}
            stroke={outlineStroke}
            strokeOpacity={outlineStrokeOpacity}
            strokeWidth={outlineStrokeWidth}
          />
        ) : null}
        <line
          {...sharedProps}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
        />
      </g>
    );
  });
}

export function DirectionalTrendOverlay({
  formattedGraphicalItems = [],
  outlineStroke,
  outlineStrokeOpacity = 1,
  outlineStrokeWidth = 4,
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
          outlineStroke,
          outlineStrokeOpacity,
          outlineStrokeWidth,
          points,
          stroke,
          strokeOpacity,
          strokeWidth,
        }) ?? [];
      })}
    </g>
  );
}
