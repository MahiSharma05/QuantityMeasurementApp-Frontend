import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConvertRequest, ConvertResponse,
  QuantityInput, QuantityOperationResponse, QuantityDTO
} from '../../shared/models/quantity.models';

@Injectable({ providedIn: 'root' })
export class QuantityService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Public unified convert (no auth required) ─────────────────────────────
  convertUnits(req: ConvertRequest): Observable<ConvertResponse> {
  return this.http.post<ConvertResponse>(`${this.base}/api/v1/quantities/convert`, req);
}

  // ── Authenticated operations ──────────────────────────────────────────────
  add(input: QuantityInput): Observable<QuantityOperationResponse<QuantityDTO>> {
    return this.http.post<QuantityOperationResponse<QuantityDTO>>(
      `${this.base}/api/v1/quantities/add`, input
    );
  }

  subtract(input: QuantityInput): Observable<QuantityOperationResponse<QuantityDTO>> {
    return this.http.post<QuantityOperationResponse<QuantityDTO>>(
      `${this.base}/api/v1/quantities/subtract`, input
    );
  }

  compare(input: QuantityInput): Observable<QuantityOperationResponse<boolean>> {
    return this.http.post<QuantityOperationResponse<boolean>>(
      `${this.base}/api/v1/quantities/compare`, input
    );
  }

  convert(input: QuantityInput): Observable<QuantityOperationResponse<QuantityDTO>> {
    return this.http.post<QuantityOperationResponse<QuantityDTO>>(
      `${this.base}/api/v1/quantities/convert`, input
    );
  }

  divide(input: QuantityInput): Observable<QuantityOperationResponse<number>> {
    return this.http.post<QuantityOperationResponse<number>>(
      `${this.base}/api/v1/quantities/divide`, input
    );
  }
}
