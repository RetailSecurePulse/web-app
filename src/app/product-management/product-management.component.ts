import {ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatDialog, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle} from '@angular/material/dialog';
import {
  MatCell, MatCellDef,
  MatColumnDef,
  MatHeaderCell, MatHeaderCellDef,
  MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef,
  MatTable,
  MatTableDataSource
} from '@angular/material/table';
import Fuse from 'fuse.js';
import { Product } from './product.model';
import { ProductService } from './product.service';
import {MatError, MatFormField, MatLabel} from '@angular/material/form-field';
import {MatIcon} from '@angular/material/icon';
import {CurrencyPipe, NgForOf, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault} from '@angular/common';
import {MatChip, MatChipListbox} from '@angular/material/chips';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatButton, MatFabButton, MatIconButton} from '@angular/material/button';
import {MatInput} from '@angular/material/input';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-product-management',
  templateUrl: './product-management.component.html',
  imports: [
    MatFormField,
    MatIcon,
    FormsModule,
    MatTable,
    NgSwitch,
    MatColumnDef,
    MatChip,
    CurrencyPipe,
    ReactiveFormsModule,
    MatButton,
    MatInput,
    MatFabButton,
    MatHeaderCell,
    MatCell,
    MatChipListbox,
    MatIconButton,
    MatHeaderRow,
    MatRow,
    MatHeaderCellDef,
    NgForOf,
    MatCellDef,
    NgSwitchCase,
    NgSwitchDefault,
    MatHeaderRowDef,
    MatRowDef,
    MatLabel,
    MatDialogClose,
    MatSlideToggle,
  ],
  styleUrls: ['./product-management.component.css']
})
export class ProductManagementComponent implements OnInit {
  product: Product | undefined ;
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchTerm: string = '';
  modalMode: 'create' | 'update' = 'create';
  productForm: FormGroup;
  isLoading = false; // Added for loading indicator
  errorMessage: string | null = null;


  cols = [
    {field: 'sku', header: 'SKU'},
    {field: 'brand', header: 'Brand'},
    {field: 'category', header: 'Category'},
    {field: 'subcategory', header: 'Subcategory'},
    {field: 'description', header: 'Description'},
    {field: 'rrp', header: 'RRP'},
    {field: 'barcode', header: 'Barcode'},
    {field: 'origin', header: 'Origin'},
    {field: 'uom', header: 'UOM'},
    {field: 'vendorCode', header: 'Vendor Code'},
    {field: 'active', header: 'Status'}
  ];

  displayedColumns: string[] = [...this.cols.map(col => col.field), 'actions'];
  @ViewChild('productDialog') productDialogTemplate!: TemplateRef<any>;
  constructor(
    private productService: ProductService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.productForm = this.fb.group({
      id: [''],
      brand: ['', Validators.required],
      category: ['', Validators.required],
      subcategory: [''],
      description: [''],
      rrp: [0, [Validators.required, Validators.min(0)]],
      barcode: [''],
      origin: [''],
      uom: [''],
      vendorCode: [''],
      active: [true]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.productService.getProducts().subscribe({
      next: (data: Product[]) => {
        // Defer the first table population so Angular doesn't see the
        // datasource change during the same initial check cycle.
        queueMicrotask(() => {
          this.products = data;
          this.filteredProducts = this.products;
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.handleError('Failed to load products', error);
        this.isLoading = false;
      }
    });
  }

  filterProducts(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredProducts = this.products;
      return;
    }

    const fuse = new Fuse(this.products, {
      keys: ['brand', 'sku', 'category', 'subcategory', 'description', 'barcode', 'origin', 'uom', 'vendorCode'],
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
    });

    const results = fuse.search(term);
    this.filteredProducts = results.map(result => result.item);
  }

  openDialog() {
    this.dialog.open(this.productDialogTemplate, {
      width: '800px',
      disableClose: true // Optional: prevents closing by clicking outside
    });
  }


  createProduct(): void {
    this.productForm.reset({ active: true });
    this.modalMode = 'create';
    this.openDialog();
  }

  editProduct(product: Product): void {
    this.productForm.patchValue({
      ...product,
      active: product.active || false
    });
    this.modalMode = 'update';
    this.openDialog();
  }

  saveProduct(): void {
    if (this.productForm.invalid) {
      return;
    }

    const formData = this.productForm.value;
    const productData = {
      ...formData,
      active: formData.active
    };

    if (this.modalMode === 'create') {
      this.handleCreateProduct(productData);
    } else {
      this.handleUpdateProduct(productData);
    }
  }

  private handleCreateProduct(productData: any) {
    this.productService.createProduct(productData).subscribe({
      next: (createdProduct) => {
        this.products.push(createdProduct);
        this.filteredProducts = [...this.products];
        this.dialog.closeAll();
        this.showSuccessSnackbar('Product created successfully');
      },
      error: (error) => this.handleError('Error creating product', error)
    });
  }

  private handleUpdateProduct(productData: any) {
    // Check if we're reactivating a previously inactive product
    const wasInactive = !this.products.find(p => p.id === productData.id)?.active;
    const isNowActive = productData.active;

    if (wasInactive && isNowActive) {
      // Use reverseProduct API for reactivation
      this.productService.reverseProduct(productData.id).subscribe({
        next: (reactivatedProduct) => {
          this.updateLocalProduct(reactivatedProduct);
          this.dialog.closeAll();
          this.showSuccessSnackbar('Product reactivated successfully');
        },
        error: (error) => this.handleError('Error reactivating product', error)
      });
    } else {
      // Normal update
      this.productService.updateProduct(productData).subscribe({
        next: (updatedProduct) => {
          this.updateLocalProduct(updatedProduct);
          this.dialog.closeAll();
          this.showSuccessSnackbar('Product updated successfully');
        },
        error: (error) => this.handleError('Error updating product', error)
      });
    }
  }

  private updateLocalProduct(updatedProduct: Product) {
    const index = this.products.findIndex(p => p.id === updatedProduct.id);
    if (index > -1) {
      this.products[index] = updatedProduct;
    } else {
      this.products.push(updatedProduct);
    }
    this.filteredProducts = [...this.products];
  }

  private showSuccessSnackbar(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private handleError(message: string, error: any) {
    console.error(message, error);
    this.snackBar.open(`${message}: ${error.message}`, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
  
  deleteProduct(product: Product): void {
    if (confirm('Are you sure you want to deactivate this product?')) {
      // Update the product's active status to false (soft delete)
      const updatedProduct = { ...product, active: false };

      this.productService.updateProduct(updatedProduct).subscribe({
        next: (result) => {
          // Update the product in both arrays
          const updateArray = (arr: Product[]) =>
            arr.map(p => p.id === product.id ? { ...p, active: false } : p);

          this.products = updateArray(this.products);
          this.filteredProducts = updateArray(this.filteredProducts);

          // Optional: Show a confirmation message
          this.snackBar.open('Product deactivated successfully', 'Close', {
            duration: 3000
          });
        },
        error: (error) => {
          console.error('Error deactivating product:', error);
          this.snackBar.open('Error deactivating product', 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }  
}
