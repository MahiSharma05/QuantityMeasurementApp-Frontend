import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { QuantityService } from '../../../core/services/quantity.service';
import { HistoryStoreService } from '../../../core/services/history-store.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  MeasurementType,
  OperationType,
  OPERATION_META,
  UNIT_MAP,
  MEASUREMENT_TYPES,
  QuantityResult,
  UnitValue,
  HistoryEntry,
} from '../../../shared/models/models';

@Component({
  selector: 'qm-converter',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './converter.component.html',
  styleUrls: ['./converter.component.css'],
})
export class ConverterComponent implements OnInit, OnDestroy {
  private fb      = inject(FormBuilder);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private qty     = inject(QuantityService);
  private history = inject(HistoryStoreService);
  private auth    = inject(AuthService);
  private destroy$ = new Subject<void>();

  // ── State ─────────────────────────────────────────────────
  currentOp: OperationType     = 'convert';
  currentType: MeasurementType = 'LengthUnit';
  loading   = false;
  errorMsg  = '';

  result: QuantityResult | boolean | number | null = null;
  historyEntries: HistoryEntry[] = [];

  // ── Template refs ──────────────────────────────────────────
  measurementTypes = MEASUREMENT_TYPES;
  opMeta           = OPERATION_META;
  unitMap          = UNIT_MAP;

  // ── Forms ─────────────────────────────────────────────────
  form!: FormGroup;

  get isSingleInput(): boolean { return this.opMeta[this.currentOp].singleInput; }
  get availableUnits(): UnitValue[] { return this.unitMap[this.currentType]; }

  // Convenience form getters
  get convertValue()    { return this.form.get('convertValue')!;    }
  get convertFromUnit() { return this.form.get('convertFromUnit')!; }
  get targetUnit()      { return this.form.get('targetUnit')!;      }
  get thisValue()       { return this.form.get('thisValue')!;       }
  get thisUnit()        { return this.form.get('thisUnit')!;        }
  get thatValue()       { return this.form.get('thatValue')!;       }
  get thatUnit()        { return this.form.get('thatUnit')!;        }

  ngOnInit(): void {
    this.historyEntries = this.history.getAll();

    // Derive the operation from the last URL segment (convert / add / subtract / compare / divide)
    this.route.url.pipe(takeUntil(this.destroy$)).subscribe(segments => {
      const seg = segments[segments.length - 1]?.path as OperationType;
      if (seg && this.opMeta[seg]) {
        this.currentOp = seg;
        this.result    = null;
        this.errorMsg  = '';
        this.applyInputMode();
        this.resetValues();
      }
    });

    this.buildForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    const units = this.availableUnits;
    this.form = this.fb.group({
      // Single-input (convert) fields
      convertValue:    [null, Validators.required],
      convertFromUnit: [units[0]],
      targetUnit:      [units[1] ?? units[0]],
      // Two-input fields
      thisValue:       [null],
      thisUnit:        [units[0]],
      thatValue:       [null],
      thatUnit:        [units[1] ?? units[0]],
    });
    this.applyInputMode();
  }

  private applyInputMode(): void {
    if (this.isSingleInput) {
      this.thisValue.clearValidators();
      this.thatValue.clearValidators();
      this.convertValue.addValidators(Validators.required);
    } else {
      this.convertValue.clearValidators();
      this.thisValue.addValidators(Validators.required);
      this.thatValue.addValidators(Validators.required);
    }
    [this.convertValue, this.thisValue, this.thatValue].forEach(c => c.updateValueAndValidity());
  }

  private resetValues(): void {
    this.form.patchValue({
      convertValue: null, thisValue: null, thatValue: null,
    });
    this.form.markAsUntouched();
  }

  selectType(type: MeasurementType): void {
    this.currentType = type;
    const units = this.unitMap[type];
    this.form.patchValue({
      convertFromUnit: units[0],
      targetUnit:      units[1] ?? units[0],
      thisUnit:        units[0],
      thatUnit:        units[1] ?? units[0],
    });
    this.result   = null;
    this.errorMsg = '';
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.loading  = true;
    this.errorMsg = '';
    this.result   = null;

    const { thisQ, thatQ } = this.isSingleInput
      ? this.buildSingleInputPayload()
      : this.buildTwoInputPayload();

    this.qty.runOperation(this.currentOp, thisQ, thatQ).subscribe({
      next: (res) => {
        this.result  = res;
        this.loading = false;
        this.addToHistory(thisQ, thatQ, res);
        this.historyEntries = this.history.getAll();
      },
      error: (err) => {
        const msg: string = err?.error?.message ?? err?.message ?? '';
        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized')) {
          this.errorMsg = 'Session expired. Redirecting to login…';
          setTimeout(() => this.auth.logout(), 2000);
        } else {
          this.errorMsg = msg || 'Operation failed. Please check your inputs.';
        }
        this.loading = false;
      },
    });
  }

  private buildSingleInputPayload() {
    const v = this.form.value;
    return {
      thisQ: { value: v.convertValue,    unit: v.convertFromUnit as UnitValue, measurementType: this.currentType },
      thatQ: { value: 0,                 unit: v.targetUnit      as UnitValue, measurementType: this.currentType },
    };
  }

  private buildTwoInputPayload() {
    const v = this.form.value;
    return {
      thisQ: { value: v.thisValue, unit: v.thisUnit as UnitValue, measurementType: this.currentType },
      thatQ: { value: v.thatValue, unit: v.thatUnit as UnitValue, measurementType: this.currentType },
    };
  }

  private addToHistory(
    thisQ: { value: number; unit: UnitValue },
    thatQ: { value: number; unit: UnitValue },
    res: QuantityResult | boolean | number
  ): void {
    const expr = `${thisQ.value} ${thisQ.unit} → ${thatQ.unit}`;
    let resultStr: string;

    if (this.currentOp === 'compare') {
      resultStr = res === true ? 'Equal' : 'Not Equal';
    } else if (this.currentOp === 'divide') {
      resultStr = typeof res === 'number' ? res.toFixed(4) : String(res);
    } else {
      const r = res as QuantityResult;
      resultStr = `${Number(r.value).toFixed(4)} ${r.unit}`;
    }

    this.history.add({ op: this.currentOp, expr, result: resultStr, type: this.currentType });
  }

  resetForm(): void {
    this.form.reset();
    const units = this.availableUnits;
    this.form.patchValue({
      convertFromUnit: units[0],
      targetUnit:      units[1] ?? units[0],
      thisUnit:        units[0],
      thatUnit:        units[1] ?? units[0],
    });
    this.result   = null;
    this.errorMsg = '';
  }

  closeResult(): void { this.result = null; }

  clearHistory(): void {
    this.history.clear();
    this.historyEntries = [];
  }

  // ── Template helpers ───────────────────────────────────────
  isQuantityResult(r: unknown): r is QuantityResult {
    return typeof r === 'object' && r !== null && 'value' in r;
  }

  asQuantityResult(r: unknown): QuantityResult { return r as QuantityResult; }

  formatNumber(v: number): string {
    return Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
}
