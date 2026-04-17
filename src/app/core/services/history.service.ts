import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OperationHistoryItem } from '../../shared/models/quantity.models';

@Injectable({ providedIn: 'root' })
export class HistoryService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUserHistory(): Observable<OperationHistoryItem[]> {
    return this.http.get<OperationHistoryItem[]>(`${this.base}/api/v1/history/user`);
  }

  getAllHistory(): Observable<OperationHistoryItem[]> {
    return this.http.get<OperationHistoryItem[]>(`${this.base}/api/v1/history/all`);
  }
}
