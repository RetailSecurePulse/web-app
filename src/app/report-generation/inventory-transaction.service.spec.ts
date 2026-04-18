// inventory-transaction.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { HttpParams } from '@angular/common/http';

import { InventoryTransactionService } from './inventory-transaction.service';
import { InventoryTransactionModel } from './inventory-transaction.model';
import { ProductModel } from './product.model';
import { ProductPricingModel } from './product-pricing.model';
import { BusinessEntityModel } from './business-entity.model';
import { ConfigService } from '../services/config.service';

describe('InventoryTransactionService', () => {
  let service: InventoryTransactionService;
  let httpSpy: jasmine.SpyObj<HttpClient>;
  let configSpy: jasmine.SpyObj<ConfigService>;
  let consoleErrorSpy: jasmine.Spy<(message?: any, ...optionalParams: any[]) => void>;

  const baseOrigin = 'http://localhost/'; // what we stub into ConfigService
  const baseUrl = `${baseOrigin}api/reports/inventory-transactions`;
  const exportUrl = `${baseUrl}/export`;

  const mockProduct: ProductModel = {
    sku: 'SKU1',
    description: 'desc',
    category: 'cat',
    subCategory: 'sub',
    brand: 'brand',
  };

  const mockPricing: ProductPricingModel = {
    quantity: 1,
    costPricePerUnit: 10,
    totalCost: 10,
  };

  const mockBusinessEntity: BusinessEntityModel = {
    name: 'Entity',
    location: 'Loc',
    type: 'Shop',
  };

  const mockTransactions: InventoryTransactionModel[] = [
    {
      transactionId: 'T1',
      product: mockProduct,
      productPricing: mockPricing,
      source: mockBusinessEntity,
      destination: { ...mockBusinessEntity, name: 'Dest' },
      transactionDateTime: '2024-05-09T12:00:00Z',
    },
  ];

  beforeEach(() => {
    httpSpy = jasmine.createSpyObj('HttpClient', ['get']);
    configSpy = jasmine.createSpyObj('ConfigService', [], {
      apiConfig: { report_api_url: baseOrigin },
    });
    consoleErrorSpy = spyOn(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: httpSpy },
        { provide: ConfigService, useValue: configSpy },
        InventoryTransactionService,
      ],
    });

    service = TestBed.inject(InventoryTransactionService);
  });

  describe('fetchInventoryTransactions', () => {
    it('should fetch inventory transactions with correct params', (done) => {
      httpSpy.get.and.returnValue(of(mockTransactions));

      const start = '2024-05-01';
      const end = '2024-05-09';
      const format = 'YYYY-MM-DD';

      service.fetchInventoryTransactions(start, end, format).subscribe({
        next: (result) => {
          expect(result).toEqual(mockTransactions);
          expect(httpSpy.get).toHaveBeenCalledTimes(1);

          const [url, options] = httpSpy.get.calls.mostRecent().args as [string, { params: HttpParams }];
          expect(url).toBe(baseUrl);
          expect(options).toBeTruthy();
          expect(options.params).toBeTruthy();
          expect(options.params.get('startDateTime')).toBe(start);
          expect(options.params.get('endDateTime')).toBe(end);
          expect(options.params.get('dateTimeFormat')).toBe(format);
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });

    it('should handle http error', (done) => {
      httpSpy.get.and.returnValue(throwError(() => new Error('fail')));

      service.fetchInventoryTransactions('2024-05-01', '2024-05-09', 'YYYY-MM-DD').subscribe({
        next: () => {
          fail('Should error');
          done();
        },
        error: (err) => {
          expect(err.message).toBe('Failed to fetch inventory transactions.');
          expect(consoleErrorSpy).toHaveBeenCalledWith('Fetch Error:', jasmine.any(Error));
          done();
        },
      });
    });

    it('should handle empty result', (done) => {
      httpSpy.get.and.returnValue(of([]));

      service.fetchInventoryTransactions('2024-05-01', '2024-05-09', 'YYYY-MM-DD').subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });

    it('should handle missing params gracefully', (done) => {
      httpSpy.get.and.returnValue(of([]));

      service.fetchInventoryTransactions('', '', '').subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          const [, options] = httpSpy.get.calls.mostRecent().args as [string, { params: HttpParams }];
          expect(options.params.get('startDateTime')).toBe('');
          expect(options.params.get('endDateTime')).toBe('');
          expect(options.params.get('dateTimeFormat')).toBe('');
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });

    it('should handle null params gracefully', (done) => {
      httpSpy.get.and.returnValue(of([]));

      // Cast to any to simulate nulls
      service.fetchInventoryTransactions(null as any, null as any, null as any).subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          const [, options] = httpSpy.get.calls.mostRecent().args as [string, { params: HttpParams }];
          // HttpParams.set(string, null as any) coerces to 'null'
          expect(options.params.get('startDateTime')).toBe('null');
          expect(options.params.get('endDateTime')).toBe('null');
          expect(options.params.get('dateTimeFormat')).toBe('null');
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });

    it('should handle invalid date/time format', (done) => {
      httpSpy.get.and.returnValue(of([]));

      service.fetchInventoryTransactions('bad-date', 'bad-date', 'bad-format').subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          const [, options] = httpSpy.get.calls.mostRecent().args as [string, { params: HttpParams }];
          expect(options.params.get('startDateTime')).toBe('bad-date');
          expect(options.params.get('endDateTime')).toBe('bad-date');
          expect(options.params.get('dateTimeFormat')).toBe('bad-format');
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });
  });

  describe('exportReport', () => {
    it('should export report and return blob with correct params', (done) => {
      const blob = new Blob(['test'], { type: 'application/pdf' });
      httpSpy.get.and.returnValue(of(blob));

      const start = '2024-05-01';
      const end = '2024-05-09';
      const format = 'YYYY-MM-DD';
      const reportType = 'pdf';

      service.exportReport(start, end, format, reportType).subscribe({
        next: (result) => {
          expect(result).toEqual(blob);
          expect(httpSpy.get).toHaveBeenCalledTimes(1);

          const [url, options] = httpSpy.get.calls.mostRecent().args as [string, { params: HttpParams; responseType: string }];
          expect(url).toBe(exportUrl);
          expect(options).toBeTruthy();
          expect(options.responseType).toBe('blob');
          expect(options.params.get('startDateTime')).toBe(start);
          expect(options.params.get('endDateTime')).toBe(end);
          expect(options.params.get('dateTimeFormat')).toBe(format);
          expect(options.params.get('format')).toBe(reportType);
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });

    it('should handle http error on export', (done) => {
      httpSpy.get.and.returnValue(throwError(() => new Error('fail')));

      service.exportReport('2024-05-01', '2024-05-09', 'YYYY-MM-DD', 'pdf').subscribe({
        next: () => {
          fail('Should error');
          done();
        },
        error: (err) => {
          // Note: exportReport has its own friendly error message
          expect(err.message).toBe('Failed to export inventory transactions.');
          expect(consoleErrorSpy).toHaveBeenCalledWith('Export Report Error:', jasmine.any(Error));
          done();
        },
      });
    });

    it('should handle missing params gracefully for export', (done) => {
      const blob = new Blob([''], { type: 'application/pdf' });
      httpSpy.get.and.returnValue(of(blob));

      service.exportReport('', '', '', '').subscribe({
        next: (result) => {
          expect(result).toEqual(blob);
          const [, options] = httpSpy.get.calls.mostRecent().args as [string, { params: HttpParams }];
          expect(options.params.get('startDateTime')).toBe('');
          expect(options.params.get('endDateTime')).toBe('');
          expect(options.params.get('dateTimeFormat')).toBe('');
          expect(options.params.get('format')).toBe('');
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });

    it('should handle null params gracefully for export', (done) => {
      const blob = new Blob([''], { type: 'application/pdf' });
      httpSpy.get.and.returnValue(of(blob));

      service.exportReport(null as any, null as any, null as any, null as any).subscribe({
        next: (result) => {
          expect(result).toEqual(blob);
          const [, options] = httpSpy.get.calls.mostRecent().args as [string, { params: HttpParams }];
          // Coerced to 'null' string by HttpParams.set
          expect(options.params.get('startDateTime')).toBe('null');
          expect(options.params.get('endDateTime')).toBe('null');
          expect(options.params.get('dateTimeFormat')).toBe('null');
          expect(options.params.get('format')).toBe('null');
          done();
        },
        error: (err) => {
          fail(`Should not error: ${err?.message}`);
          done();
        },
      });
    });
  });
});
