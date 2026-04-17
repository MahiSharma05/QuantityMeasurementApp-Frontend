import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { SidebarComponent } from '../../../shared/components/sidebar/sidebar.component';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { QuantityService } from '../../../core/services/quantity.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { Observable } from 'rxjs';

import {
  UNIT_GROUPS,
  UNIT_OPTIONS,
  MeasurementType,
  ConvertResponse,
  QuantityDTO
} from '../../../shared/models/quantity.models';

type OperationMode = 'convert' | 'add' | 'subtract' | 'compare' | 'divide';

interface ResultDisplay {
  type: 'convert' | 'quantity' | 'boolean' | 'number';
  data: ConvertResponse | QuantityDTO | boolean | number | null;
}

@Component({
  selector: 'app-converter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, SpinnerComponent],
  templateUrl: './converter.component.html',
  styleUrls: ['../dashboard/dashboard.component.scss', './converter.component.scss']
})
export class ConverterComponent {

  private quantityService = inject(QuantityService);
  private toast = inject(ToastService);
  authService = inject(AuthService);
  private fb = inject(FormBuilder);

  loading = signal(false);
  result = signal<ResultDisplay | null>(null);

  selectedType = signal<MeasurementType>('LENGTH');
  mode = signal<OperationMode>('convert');

  readonly measurementTypes: MeasurementType[] = ['LENGTH', 'WEIGHT', 'VOLUME', 'TEMPERATURE'];
  readonly unitGroups = UNIT_GROUPS;
  readonly allUnits = UNIT_OPTIONS;

  readonly typeIcons: Record<MeasurementType, string> = {
    LENGTH: '↔',
    WEIGHT: '⊕',
    VOLUME: '◎',
    TEMPERATURE: '◉',
  };

  private readonly allModes: { value: OperationMode; label: string; icon: string }[] = [
    { value: 'convert', label: 'Convert', icon: '⇌' },
    { value: 'add', label: 'Add', icon: '+' },
    { value: 'subtract', label: 'Subtract', icon: '−' },
    { value: 'compare', label: 'Compare', icon: '=' },
    { value: 'divide', label: 'Divide', icon: '÷' },
  ];

  readonly modes = computed(() => {
    if (this.selectedType() === 'TEMPERATURE') {
      return this.allModes.filter(m =>
        m.value === 'convert' || m.value === 'compare'
      );
    }
    return this.allModes;
  });

  constructor() {
    effect(() => {
      if (this.selectedType() === 'TEMPERATURE') {
        if (!['convert', 'compare'].includes(this.mode())) {
          this.mode.set('convert');
        }
      }
    });
  }

  simpleForm: FormGroup = this.fb.group({
    value: [null, [Validators.required]],
    fromUnit: ['', Validators.required],
    toUnit: ['', Validators.required],
  });

  binaryForm: FormGroup = this.fb.group({
    thisValue: [null, Validators.required],
    thisUnit: ['', Validators.required],
    thatValue: [null, Validators.required],
    thatUnit: ['', Validators.required],
  });

  currentUnits = computed(() => this.unitGroups[this.selectedType()]);

  setType(type: MeasurementType): void {
  this.selectedType.set(type);

  if (type === 'TEMPERATURE' && !['convert', 'compare'].includes(this.mode())) {
    this.mode.set('convert');
  }

  this.simpleForm.reset();
  this.binaryForm.reset();
  this.result.set(null);

  // ✅ FIX: set default units for non-temperature
  const units = this.unitGroups[type];

  if (type !== 'TEMPERATURE' && units?.length) {
    this.binaryForm.patchValue({
      thisUnit: units[0].value,
      thatUnit: units[0].value
    });

    this.simpleForm.patchValue({
      fromUnit: units[0].value,
      toUnit: units[0].value
    });
  }
}

  setMode(mode: OperationMode): void {
    this.mode.set(mode);
    this.result.set(null);
  }

  submitSimple(): void {
    if (this.simpleForm.invalid) {
      this.simpleForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.result.set(null);

    const { value, fromUnit, toUnit } = this.simpleForm.value;

    const request = {
      thisQuantity: {
        value: +value,
        unit: fromUnit
      },
      thatQuantity: {
        value: 0,
        unit: toUnit
      }
    };

    (this.quantityService.convert(request) as Observable<any>)
      .subscribe({
        next: (res: any) => {
          const r = res.result;

          this.result.set({
          type: 'convert',
          data: {
          inputValue: value,
          fromUnit: fromUnit,
          toUnit: toUnit,
          result: r.value
           }
         });

          this.loading.set(false);

          
        },
        error: () => {
          this.loading.set(false);
        }
      });
  }

  submitBinary(): void {
    if (this.binaryForm.invalid) {
      this.binaryForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.result.set(null);

    const { thisValue, thisUnit, thatValue, thatUnit } = this.binaryForm.value;

    const input = {
      thisQuantity: { value: +thisValue, unit: thisUnit },
      thatQuantity: { value: +thatValue, unit: thatUnit },
    };

    let op$: Observable<any>;

    switch (this.mode()) {
      case 'add':
        op$ = this.quantityService.add(input);
        break;
      case 'subtract':
        op$ = this.quantityService.subtract(input);
        break;
      case 'compare':
        op$ = this.quantityService.compare(input);
        break;
      case 'divide':
        op$ = this.quantityService.divide(input);
        break;
      default:
        op$ = this.quantityService.convert(input);
    }

    op$.subscribe({
      next: (res: any) => {
        const r = res.result;

        if (typeof r === 'boolean') {
          this.result.set({ type: 'boolean', data: r });
        } else if (typeof r === 'number') {
          this.result.set({ type: 'number', data: r });
        } else {
          this.result.set({ type: 'quantity', data: r as QuantityDTO });
        }

        this.loading.set(false);
        this.toast.success('Operation completed');
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  asConvert(d: any): ConvertResponse { return d as ConvertResponse; }
  asQuantity(d: any): QuantityDTO { return d as QuantityDTO; }
  asBoolean(d: any): boolean { return d as boolean; }
  asNumber(d: any): number { return d as number; }

  getUnitLabel(value: string): string {
    return this.allUnits.find(u => u.value === value)?.label ?? value;
  }

  formatNumber(n: number): string {
    if (n === null || n === undefined) return '';
    return Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(6)).toString();
  }
}