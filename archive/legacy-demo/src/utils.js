export function createSegmentalDataFromRecord(record) {
  const muscle = Number(record?.muscle ?? 0);
  const fat = Number(record?.fat ?? 0);
  const fatPercent = Number(record?.fatPercent ?? 0);

  const armMuscleBase = muscle * 0.075;
  const armFatBase = fat * 0.09;
  const legMuscleBase = muscle * 0.235;
  const legFatBase = fat * 0.16;
  const trunkMuscleBase = muscle * 0.65;
  const trunkFatBase = fat * 0.5;

  return {
    leftArm: {
      name: "Left Arm",
      muscle: Number((armMuscleBase * 0.99).toFixed(2)),
      fat: Number((armFatBase * 1.02).toFixed(2)),
      muscleRatio: Number((98 + (muscle - 30) * 1.8).toFixed(1)),
      fatRatio: Number((100 + (fatPercent - 18) * 4).toFixed(1)),
    },
    rightArm: {
      name: "Right Arm",
      muscle: Number((armMuscleBase * 1.01).toFixed(2)),
      fat: Number((armFatBase * 0.98).toFixed(2)),
      muscleRatio: Number((100 + (muscle - 30) * 1.8).toFixed(1)),
      fatRatio: Number((98 + (fatPercent - 18) * 4).toFixed(1)),
    },
    trunk: {
      name: "Trunk",
      muscle: Number(trunkMuscleBase.toFixed(2)),
      fat: Number(trunkFatBase.toFixed(2)),
      muscleRatio: Number((96 + (muscle - 30) * 1.4).toFixed(1)),
      fatRatio: Number((120 + (fatPercent - 18) * 7).toFixed(1)),
    },
    leftLeg: {
      name: "Left Leg",
      muscle: Number((legMuscleBase * 0.995).toFixed(2)),
      fat: Number((legFatBase * 1.01).toFixed(2)),
      muscleRatio: Number((99 + (muscle - 30) * 1.6).toFixed(1)),
      fatRatio: Number((99 + (fatPercent - 18) * 3.5).toFixed(1)),
    },
    rightLeg: {
      name: "Right Leg",
      muscle: Number((legMuscleBase * 1.005).toFixed(2)),
      fat: Number((legFatBase * 0.99).toFixed(2)),
      muscleRatio: Number((100 + (muscle - 30) * 1.6).toFixed(1)),
      fatRatio: Number((98 + (fatPercent - 18) * 3.5).toFixed(1)),
    },
  };
}

export function toNullableNumber(value) {
  if (value === "" || value == null) return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
}

export function buildSegmentalOverridesFromForm(formData, baseSegmental = null) {
  const overrides = {
    leftArm: {
      muscle: toNullableNumber(formData.get("segmentLeftArmMuscle")),
      fat: toNullableNumber(formData.get("segmentLeftArmFat")),
    },
    rightArm: {
      muscle: toNullableNumber(formData.get("segmentRightArmMuscle")),
      fat: toNullableNumber(formData.get("segmentRightArmFat")),
    },
    trunk: {
      muscle: toNullableNumber(formData.get("segmentTrunkMuscle")),
      fat: toNullableNumber(formData.get("segmentTrunkFat")),
    },
    leftLeg: {
      muscle: toNullableNumber(formData.get("segmentLeftLegMuscle")),
      fat: toNullableNumber(formData.get("segmentLeftLegFat")),
    },
    rightLeg: {
      muscle: toNullableNumber(formData.get("segmentRightLegMuscle")),
      fat: toNullableNumber(formData.get("segmentRightLegFat")),
    },
  };

  if (Object.values(overrides).every((part) => part.muscle == null && part.fat == null)) {
    return baseSegmental ?? null;
  }

  const fallback = baseSegmental ?? createSegmentalDataFromRecord({
    muscle: toNullableNumber(formData.get("muscle")),
    fat: toNullableNumber(formData.get("fat")),
    fatPercent: toNullableNumber(formData.get("fatPercent")),
  });

  return {
    leftArm: {
      ...fallback.leftArm,
      muscle: overrides.leftArm.muscle ?? fallback.leftArm.muscle,
      fat: overrides.leftArm.fat ?? fallback.leftArm.fat,
    },
    rightArm: {
      ...fallback.rightArm,
      muscle: overrides.rightArm.muscle ?? fallback.rightArm.muscle,
      fat: overrides.rightArm.fat ?? fallback.rightArm.fat,
    },
    trunk: {
      ...fallback.trunk,
      muscle: overrides.trunk.muscle ?? fallback.trunk.muscle,
      fat: overrides.trunk.fat ?? fallback.trunk.fat,
    },
    leftLeg: {
      ...fallback.leftLeg,
      muscle: overrides.leftLeg.muscle ?? fallback.leftLeg.muscle,
      fat: overrides.leftLeg.fat ?? fallback.leftLeg.fat,
    },
    rightLeg: {
      ...fallback.rightLeg,
      muscle: overrides.rightLeg.muscle ?? fallback.rightLeg.muscle,
      fat: overrides.rightLeg.fat ?? fallback.rightLeg.fat,
    },
  };
}

export function ensureSegmentalData(record) {
  if (!record.segmental) {
    record.segmental = createSegmentalDataFromRecord(record);
  }
  return record.segmental;
}

export function hydrateSegmentalData(records) {
  records.forEach((record) => {
    ensureSegmentalData(record);
  });
}

export function mapSegmentRowsToObject(segmentRows = []) {
  return segmentRows.reduce((acc, row) => {
    acc[row.part_key] = {
      name: row.part_name,
      muscle: row.muscle,
      fat: row.fat,
      muscleRatio: row.muscle_ratio,
      fatRatio: row.fat_ratio,
    };
    return acc;
  }, {});
}

export function mapRecordRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.recorded_at,
    height: row.height,
    age: row.age,
    gender: row.gender,
    score: row.score,
    weight: row.weight,
    muscle: row.muscle,
    fat: row.fat,
    fatPercent: row.fat_percent,
    visceralFatLevel: row.visceral_fat_level,
    bmr: row.bmr,
    recommendedCalories: row.recommended_calories,
    isIncludedInCharts: row.is_included_in_charts,
    sourceType: row.source_type,
    segmental: mapSegmentRowsToObject(row.inbody_segments || []),
  };
}

export function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDecimal(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";
  if (Number.isInteger(numericValue)) {
    return String(numericValue);
  }
  return numericValue.toFixed(2);
}

export function formatDisplayNumber(value, suffix = "") {
  if (value == null) return "-";
  return `${formatDecimal(value)}${suffix}`;
}

export function formatUnitValue(value, unit = "") {
  if (!unit) return value;
  if (unit === "%") return `${value}%`;
  return `${value} ${unit}`;
}

export function formatAxisTickValue(metric, value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "-";

  if (Math.abs(numericValue) >= 1000) {
    const abbreviated = Number((numericValue / 1000).toFixed(Number.isInteger(numericValue / 1000) ? 0 : 1));
    return `${abbreviated}K`;
  }

  return formatMetricValue(metric, numericValue);
}

export function formatMetricValue(metric, value, includeUnit = true) {
  if (value == null) return "-";

  const formattedValue = formatDecimal(value);
  if (formattedValue === "-") return formattedValue;

  if (!includeUnit) {
    return formattedValue;
  }

  if (metric.unit) {
    return formatUnitValue(formattedValue, metric.unit);
  }

  return formattedValue;
}

export function formatMetricDelta(metric, latestValue, previousValue) {
  if (latestValue == null || previousValue == null) return null;

  const delta = Number(latestValue) - Number(previousValue);
  if (!Number.isFinite(delta)) return null;

  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${formatMetricValue(metric, Math.abs(delta))}`;
}

export function formatMetricSummary(metric, latestValue, previousValue) {
  const deltaLabel = formatMetricDelta(metric, latestValue, previousValue);
  return deltaLabel || "-";
}

export function getAvatarUrl(user) {
  const metadata = user?.user_metadata || {};
  return metadata.avatar_url || metadata.picture || "https://placehold.co/96x96/png?text=U";
}

export function getDisplayName(user) {
  const metadata = user?.user_metadata || {};
  return metadata.full_name || metadata.name || user?.email || "Unknown User";
}

export function formatSourceType(sourceType) {
  if (!sourceType) return "Unknown source";
  if (sourceType === "manual") return "Manual";
  if (sourceType === "scan" || sourceType === "photo_scan") return "Photo Scan";
  return sourceType;
}

export function buildRecordFromForm(formElement, baseRecord = null) {
  const formData = new FormData(formElement);

  return {
    date: String(formData.get("date") || ""),
    height: toNullableNumber(formData.get("height")),
    age: toNullableNumber(formData.get("age")),
    gender: String(formData.get("gender") || ""),
    score: toNullableNumber(formData.get("score")),
    weight: toNullableNumber(formData.get("weight")),
    muscle: toNullableNumber(formData.get("muscle")),
    fat: toNullableNumber(formData.get("fat")),
    fatPercent: toNullableNumber(formData.get("fatPercent")),
    visceralFatLevel: toNullableNumber(formData.get("visceralFatLevel")),
    bmr: toNullableNumber(formData.get("bmr")),
    recommendedCalories: toNullableNumber(formData.get("recommendedCalories")),
    sourceType: String(formData.get("sourceType") || "manual"),
    isIncludedInCharts: formData.has("isIncludedInCharts"),
    segmental: buildSegmentalOverridesFromForm(formData, baseRecord?.segmental ?? null),
  };
}