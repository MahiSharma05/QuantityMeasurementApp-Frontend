// ─── Auth Models ───────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export interface UserSession {
  token: string;
  email: string;
  name: string;
  avatar: string;
  source: 'password' | 'google';
}

// ─── Quantity Models ────────────────────────────────────────────────────────

export type MeasurementType = 'LengthUnit' | 'TemperatureUnit' | 'VolumeUnit' | 'WeightUnit';

export type LengthUnit      = 'FEET' | 'INCHES' | 'CENTIMETER' | 'YARDS';
export type TemperatureUnit = 'CELSIUS' | 'FAHRENHEIT';
export type VolumeUnit      = 'LITER' | 'MILLILITER' | 'GALLON';
export type WeightUnit      = 'KILOGRAM' | 'GRAM' | 'POUND' | 'TONNE' | 'MILLIGRAM';

export type UnitValue = LengthUnit | TemperatureUnit | VolumeUnit | WeightUnit;

export interface Quantity {
  value: number;
  unit: UnitValue;
  measurementType: MeasurementType;
}

export interface QuantityRequest {
  thisQuantity: Quantity;
  thatQuantity: Quantity;
}

export interface QuantityResult {
  value: number;
  unit: UnitValue;
  measurementType: MeasurementType;
}

// ─── Operation Models ──────────────────────────────────────────────────────

export type OperationType = 'convert' | 'add' | 'subtract' | 'compare' | 'divide';

export interface OperationMeta {
  label: string;
  desc: string;
  endpoint: string;
  singleInput: boolean;
  icon: string;
}

export const OPERATION_META: Record<OperationType, OperationMeta> = {
  convert: {
    label: 'Unit Conversion',
    desc: 'Enter a value, choose its source unit, then pick the target unit — result is calculated automatically.',
    endpoint: '/api/v1/quantities/convert',
    singleInput: true,
    icon: 'convert',
  },
  add: {
    label: 'Addition',
    desc: 'Add two quantities together (result expressed in the target unit).',
    endpoint: '/api/v1/quantities/add',
    singleInput: false,
    icon: 'add',
  },
  subtract: {
    label: 'Subtraction',
    desc: 'Subtract the second quantity from the first.',
    endpoint: '/api/v1/quantities/subtract',
    singleInput: false,
    icon: 'subtract',
  },
  compare: {
    label: 'Comparison',
    desc: 'Check whether two quantities are equal.',
    endpoint: '/api/v1/quantities/compare',
    singleInput: false,
    icon: 'compare',
  },
  divide: {
    label: 'Division',
    desc: 'Divide the first quantity by the second — returns a dimensionless ratio.',
    endpoint: '/api/v1/quantities/divide',
    singleInput: false,
    icon: 'divide',
  },
};

export const UNIT_MAP: Record<MeasurementType, UnitValue[]> = {
  LengthUnit:      ['FEET', 'INCHES', 'CENTIMETER', 'YARDS'],
  TemperatureUnit: ['CELSIUS', 'FAHRENHEIT'],
  VolumeUnit:      ['LITER', 'MILLILITER', 'GALLON'],
  WeightUnit:      ['KILOGRAM', 'GRAM', 'POUND', 'TONNE', 'MILLIGRAM'],
};

export const MEASUREMENT_TYPES: { type: MeasurementType; label: string; emoji: string }[] = [
  { type: 'LengthUnit',      label: 'Length',      emoji: '📏' },
  { type: 'TemperatureUnit', label: 'Temperature',  emoji: '🌡️' },
  { type: 'VolumeUnit',      label: 'Volume',       emoji: '🧪' },
  { type: 'WeightUnit',      label: 'Weight',       emoji: '⚖️' },
];

// ─── History Models ─────────────────────────────────────────────────────────

export interface HistoryEntry {
  op: OperationType;
  expr: string;
  result: string;
  type: MeasurementType;
  time: string;
}
