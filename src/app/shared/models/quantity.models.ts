// ── Unit definitions ──────────────────────────────────────────────────────────
export type MeasurementType = 'LENGTH' | 'WEIGHT' | 'VOLUME' | 'TEMPERATURE';

export interface UnitOption {
  value: string;
  label: string;
  type: MeasurementType;
}

export const UNIT_OPTIONS: UnitOption[] = [
  // LENGTH
  { value: 'INCH',        label: 'Inch',        type: 'LENGTH' },
  { value: 'FEET',        label: 'Feet',         type: 'LENGTH' },
  { value: 'YARDS',       label: 'Yards',        type: 'LENGTH' },
  { value: 'CENTIMETERS', label: 'Centimeters',  type: 'LENGTH' },
  { value: 'METER',       label: 'Meter',        type: 'LENGTH' },
  { value: 'KILOMETER',   label: 'Kilometer',    type: 'LENGTH' },
  { value: 'MILE',        label: 'Mile',         type: 'LENGTH' },
  // WEIGHT
  { value: 'MILLIGRAM',   label: 'Milligram',    type: 'WEIGHT' },
  { value: 'GRAM',        label: 'Gram',         type: 'WEIGHT' },
  { value: 'KILOGRAM',    label: 'Kilogram',     type: 'WEIGHT' },
  { value: 'POUND',       label: 'Pound',        type: 'WEIGHT' },
  { value: 'TONNE',       label: 'Tonne',        type: 'WEIGHT' },
  // VOLUME
  { value: 'LITRE',       label: 'Litre',        type: 'VOLUME' },
  { value: 'MILLILITRE',  label: 'Millilitre',   type: 'VOLUME' },
  { value: 'GALLON',      label: 'Gallon',       type: 'VOLUME' },
  // TEMPERATURE
  { value: 'CELSIUS',     label: 'Celsius (°C)', type: 'TEMPERATURE' },
  { value: 'FAHRENHEIT',  label: 'Fahrenheit (°F)', type: 'TEMPERATURE' },
];

export const UNIT_GROUPS: Record<MeasurementType, UnitOption[]> = {
  LENGTH:      UNIT_OPTIONS.filter(u => u.type === 'LENGTH'),
  WEIGHT:      UNIT_OPTIONS.filter(u => u.type === 'WEIGHT'),
  VOLUME:      UNIT_OPTIONS.filter(u => u.type === 'VOLUME'),
  TEMPERATURE: UNIT_OPTIONS.filter(u => u.type === 'TEMPERATURE'),
};

export const MEASUREMENT_TYPES: MeasurementType[] = ['LENGTH', 'WEIGHT', 'VOLUME', 'TEMPERATURE'];

// ── Request / Response DTOs ──────────────────────────────────────────────────

export interface QuantityDTO {
  value: number;
  unit: string;
  measurementType?: string;
}

export interface QuantityInput {
  thisQuantity: QuantityDTO;
  thatQuantity: QuantityDTO;
}

export interface QuantityOperationResponse<T> {
  result: T;
  operation: string;
  timestamp: string;
  authenticatedUser: string;
}

export interface ConvertRequest {
  value: number;
  fromUnit: string;
  toUnit: string;
}

export interface ConvertResponse {
  result: number;
  fromUnit: string;
  toUnit: string;
  inputValue: number;
}

// ── History ──────────────────────────────────────────────────────────────────

export interface OperationHistoryItem {
  id: number;
  username: string;
  operationType: string;
  inputData: string;
  result: string;
  timestamp: string;
}
