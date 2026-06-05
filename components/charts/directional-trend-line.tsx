type TrendPoint = {
  x?: number;
  y?: number;
  value?: number | null;
};

type GraphicalItem = {
  item?: {
    props?: {
      stroke?: string;
      strokeWidth?: number;
    };
  };
  props?: {
    points?: TrendPoint[];
    stroke?: string;
    strokeWidth?: number;
  };
};

type DirectionalTrendOverlayProps = {
  formattedGraphicalItems?: GraphicalItem[];
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function renderSegments(points: TrendPoint[], stroke: string, strokeWidth: number, keyPrefix: string) {
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
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  });
}

export function DirectionalTrendOverlay({ formattedGraphicalItems = [] }: DirectionalTrendOverlayProps) {
  if (!formattedGraphicalItems.length) {
    return null;
  }

  return (
    <g pointerEvents="none">
      {formattedGraphicalItems.flatMap((item, index) => {
        const points = item.props?.points ?? [];
        const stroke = item.item?.props?.stroke ?? item.props?.stroke ?? "#0f172a";
        const strokeWidth = item.item?.props?.strokeWidth ?? item.props?.strokeWidth ?? 2;
        return renderSegments(points, stroke, strokeWidth, `trend-${index}`) ?? [];
      })}
    </g>
  );
}
