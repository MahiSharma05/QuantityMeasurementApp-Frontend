import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OperationType,
  OPERATION_META,
  Quantity,
  QuantityResult,
} from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class QuantityService {
  private http = inject(HttpClient);
  private base = environment.apiBaseUrl;

  /**
   * Runs any quantity operation against the Spring Boot API.
   * JWT is attached automatically by the AuthInterceptor.
   * compare → boolean, divide → number, others → QuantityResult
   */
  runOperation(
    operation: OperationType,
    thisQuantity: Quantity,
    thatQuantity: Quantity,
  ): Observable<QuantityResult | boolean | number> {
    const endpoint = OPERATION_META[operation].endpoint;
    return this.http.post<QuantityResult | boolean | number>(
      `${this.base}${endpoint}`,
      { thisQuantity, thatQuantity },
    );
  }
}
