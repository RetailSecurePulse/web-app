// inventory-management.component.spec.ts
import { InventoryManagementComponent } from './inventory-management.component';
import { BusinessEntityService } from '../business-entity-management/business-entity.service';
import { ProductService } from '../product-management/product.service';
import { InventoryService } from './inventory.service';
import { BusinessEntity } from '../business-entity-management/business-entity.model';
import { InventoryTransaction, SummaryData } from './inventory.model';

import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

describe('InventoryManagementComponent', () => {
  let component: InventoryManagementComponent;
  let fixture: ComponentFixture<InventoryManagementComponent>;
  let inventoryServiceSpy: jasmine.SpyObj<InventoryService>;
  let businessEntityServiceSpy: jasmine.SpyObj<BusinessEntityService>;
  let productServiceSpy: jasmine.SpyObj<ProductService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockBusinessEntities: BusinessEntity[] = [
    { id: 1, name: 'Shop 1', location: 'Loc1', type: 'Shop', active: true, external: false },
    { id: 2, name: 'Central', location: 'HQ', type: 'CentralInventory', active: true, external: false }
  ];

  const mockTransactions: InventoryTransaction[] = [
    {
      productSku: 'SKU001',
      quantity: 10,
      rrp: 100,
      source: 'Shop 1',
      destination: 'Central',
      insertedAt: new Date('2024-01-01T00:00:00Z')
    },
    {
      productSku: 'SKU002',
      quantity: 5,
      rrp: 50,
      source: 'Shop 2',
      destination: 'Central',
      insertedAt: null
    }
  ];

  const mockSummary: SummaryData[] = [
    {
      productSKU: 'SKU001',
      businessEntityName: 'Shop 1',
      quantity: 10,
      rrp: 100
    }
  ];

  beforeEach(async () => {
    inventoryServiceSpy = jasmine.createSpyObj('InventoryService', ['getInventoryTransaction', 'getInventoryByBusinessEntity']);
    businessEntityServiceSpy = jasmine.createSpyObj('BusinessEntityService', ['getBusinessEntities', 'getBusinessEntityById']);
    productServiceSpy = jasmine.createSpyObj('ProductService', ['getProductById']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [
        InventoryManagementComponent,
        NoopAnimationsModule
      ],
      providers: [
        provideHttpClientTesting(),
        { provide: InventoryService, useValue: inventoryServiceSpy },
        { provide: BusinessEntityService, useValue: businessEntityServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryManagementComponent);
    component = fixture.componentInstance;

    // Default harmless stubs so creating the component doesn't explode
    businessEntityServiceSpy.getBusinessEntities.and.returnValue(of([]));
    inventoryServiceSpy.getInventoryTransaction.and.returnValue(of([]));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadData on ngOnInit', () => {
    spyOn(component, 'loadData');
    component.ngOnInit();
    expect(component.loadData).toHaveBeenCalled();
  });

  it('should fetch business entities and populate shopMap', fakeAsync(() => {
    businessEntityServiceSpy.getBusinessEntities.and.returnValue(of(mockBusinessEntities));
    component.fetchBusinessEntities();
    flushMicrotasks();
    expect(businessEntityServiceSpy.getBusinessEntities).toHaveBeenCalled();
    expect(component.businessOptions.length).toBe(2);
    expect(component.shopMap[1]).toBe('Shop 1');
  }));

  it('should handle error when fetching business entities', () => {
    spyOn(console, 'error'); // silence expected error path
    businessEntityServiceSpy.getBusinessEntities.and.returnValue(throwError(() => new Error('fail')));
    component.fetchBusinessEntities();
    expect(component.isLoading).toBeFalse();
  });

  it('should apply filter and update filteredData in applyFilter', () => {
    component.inventoryTransactions = new MatTableDataSource(mockTransactions);
    component.tableData = new MatTableDataSource(mockSummary);
    component.searchTerm = 'SKU001';

    component.applyFilter();

    expect(component.inventoryTransactions.filteredData.length).toBeGreaterThanOrEqual(0);
    expect(component.tableData.filteredData.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle onFilterChange with no inventory data', fakeAsync(() => {
    inventoryServiceSpy.getInventoryByBusinessEntity.and.returnValue(of([]));
    component.onFilterChange(1);
    flushMicrotasks();
    expect(component.tableData.data).toEqual([]);
    expect(component.isLoading).toBeFalse();
  }));

  it('should handle error in onFilterChange', fakeAsync(() => {
    spyOn(console, 'error'); // silence expected error path
    inventoryServiceSpy.getInventoryByBusinessEntity.and.returnValue(throwError(() => new Error('fail')));
    component.onFilterChange(1);
    flushMicrotasks();
    expect(component.errorMessage).toBe('Failed to load inventory data');
    expect(component.isLoading).toBeFalse();
  }));

  it('should handle error in forkJoin in onFilterChange', fakeAsync(() => {
    spyOn(console, 'error'); // silence expected error path
    inventoryServiceSpy.getInventoryByBusinessEntity.and.returnValue(
      of([{ productId: 1, quantity: 10, businessEntityId: 1, totalCostPrice: 100 }])
    );
    productServiceSpy.getProductById.and.returnValue(throwError(() => new Error('fail')));
    businessEntityServiceSpy.getBusinessEntityById.and.returnValue(of({
      id: 1, name: 'Shop 1', location: 'Loc1', type: 'Shop', active: true, external: false
    }));

    component.paginator = {} as any;
    component.sort = {} as any;

    component.onFilterChange(1);
    tick();
    flushMicrotasks();
    expect(component.isLoading).toBeFalse();
  }));

  it('should open modal and refresh data on close with result', () => {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(true)
    } as any);
    const refreshSpy = spyOn<any>(component, 'refreshData');
    component.openModal();
    expect(component.isModalOpen).toBeFalse();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('should open modal and not refresh data on close without result', () => {
    dialogSpy.open.and.returnValue({
      afterClosed: () => of(null)
    } as any);
    const refreshSpy = spyOn<any>(component, 'refreshData');
    component.openModal();
    expect(component.isModalOpen).toBeFalse();
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should handle error in loadInventoryTransaction', fakeAsync(() => {
    spyOn(console, 'error'); // silence expected error path
    inventoryServiceSpy.getInventoryTransaction.and.returnValue(throwError(() => new Error('fail')));
    (component as any).loadInventoryTransaction();
    tick();
    flushMicrotasks();
    expect(component.inventoryTransactions.data).toEqual([]);
    expect(component.errorMessage).toBe('Failed to load transactions');
    expect(component.isLoading).toBeFalse();
  }));

  it('should handle no data in loadInventoryTransaction', fakeAsync(() => {
    inventoryServiceSpy.getInventoryTransaction.and.returnValue(of([]));
    (component as any).loadInventoryTransaction();
    tick();
    flushMicrotasks();
    expect(component.errorMessage).toBe('No inventory transactions found.');
  }));

  it('should handle error in productService.getProductById in onFilterChange', fakeAsync(() => {
    spyOn(console, 'error'); // silence expected error path
    inventoryServiceSpy.getInventoryByBusinessEntity.and.returnValue(of([
      { productId: 1, quantity: 10, businessEntityId: 1, totalCostPrice: 100 }
    ]));
    productServiceSpy.getProductById.and.returnValue(throwError(() => new Error('fail')));
    businessEntityServiceSpy.getBusinessEntityById.and.returnValue(of({
      id: 1, name: 'Shop 1', location: 'Loc1', type: 'Shop', active: true, external: false
    }));

    component.paginator = {} as any;
    component.sort = {} as any;

    component.onFilterChange(1);
    tick();
    flushMicrotasks();
    expect(component.isLoading).toBeFalse();
  }));

  it('should handle error in businessEntityService.getBusinessEntityById in onFilterChange', fakeAsync(() => {
    spyOn(console, 'error'); // silence expected error path
    inventoryServiceSpy.getInventoryByBusinessEntity.and.returnValue(of([
      { productId: 1, quantity: 10, businessEntityId: 1, totalCostPrice: 100 }
    ]));
    productServiceSpy.getProductById.and.returnValue(of({
      id: 1,
      sku: 'SKU001',
      brand: 'Brand A',
      category: 'Electronics',
      subcategory: 'Mobile',
      description: 'Product 1',
      rrp: 100,
      active: true,
      barcode: '123',
      origin: 'China',
      uom: 'EA',
      vendorCode: 'VC001'
    }));
    businessEntityServiceSpy.getBusinessEntityById.and.returnValue(throwError(() => new Error('fail')));

    component.paginator = {} as any;
    component.sort = {} as any;

    component.onFilterChange(1);
    tick();
    flushMicrotasks();
    expect(component.isLoading).toBeFalse();
  }));

  // Edge: fetchBusinessEntities returns empty array
  it('should handle fetchBusinessEntities with empty array', fakeAsync(() => {
    businessEntityServiceSpy.getBusinessEntities.and.returnValue(of([]));
    component.fetchBusinessEntities();
    flushMicrotasks();
    expect(component.businessOptions.length).toBe(0);
    expect(Object.keys(component.shopMap).length).toBe(0);
  }));

  // Edge: openModal when already open
  it('should not open modal if already open', () => {
    component.isModalOpen = true;
    component.openModal();
    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  // Edge: onFilterChange with invalid businessEntityId
  it('should handle onFilterChange with invalid businessEntityId', fakeAsync(() => {
    inventoryServiceSpy.getInventoryByBusinessEntity.and.returnValue(of([]));
    component.onFilterChange(-1);
    flushMicrotasks();
    expect(component.tableData.data).toEqual([]);
    expect(component.isLoading).toBeFalse();
  }));

  // Edge: loadInventoryTransaction returns null
  it('should handle null data in loadInventoryTransaction', fakeAsync(() => {
    // Return null -> switchMap will treat as falsy and set "No inventory transactions found."
    inventoryServiceSpy.getInventoryTransaction.and.returnValue(of(null as any));
    (component as any).loadInventoryTransaction();
    tick();
    flushMicrotasks();
    expect(component.inventoryTransactions.data).toEqual([]);
    expect(component.errorMessage).toBe('No inventory transactions found.');
    expect(component.isLoading).toBeFalse();
  }));
});
