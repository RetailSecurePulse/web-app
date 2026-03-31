import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef} from '@angular/material/dialog';
import {MatIcon} from '@angular/material/icon';
import {CurrencyPipe, DatePipe, NgForOf, NgIf} from '@angular/common';
import {MatButton} from '@angular/material/button';

export interface PaymentSuccessData {
  transactionId?: number;
  amount?: number | string;
  currency?: string;
  createdAt?: string;         // ISO or human-friendly date
  items?: Array<{ sku?: string; description?: string; quantity?: number; unitPrice?: number }>;
  raw?: any;                  // any other payload from backend
}

@Component({
  selector: 'app-payment-success-dialog',
  imports: [
    MatDialogContent,
    MatIcon,
    CurrencyPipe,
    DatePipe,
    MatDialogActions,
    NgForOf,
    NgIf,
    MatButton
  ],
  templateUrl: './payment-success-dialog.component.html',
  styleUrl: './payment-success-dialog.component.scss'
})
export class PaymentSuccessDialogComponent {
  now: Date = new Date();

  constructor(
    private dialogRef: MatDialogRef<PaymentSuccessDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentSuccessData
  ) {}

  close() {
    this.dialogRef.close();
  }

  viewDetails() {
    // Keep dialog open and optionally route to receipt page in parent
    // For now, just close and indicate parent can route (or you can navigate here)
    this.dialogRef.close({ action: 'view', data: this.data });
  }

  printReceipt() {
    // Create a minimal printable page and trigger browser print
    const html = this.renderReceiptHtml();
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      // popup blocked
      alert('Popup blocked. Please allow popups to print the receipt.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // give browser a small delay to render before printing
    setTimeout(() => {
      w.focus();
      w.print();
      // optionally close after print (comment out if you want user control)
      // w.close();
    }, 250);
  }

  private renderReceiptHtml(): string {
    const d = this.data || {};
    const itemsHtml = (d.items || []).map(i => `
      <tr>
        <td style="padding:4px 8px;">${i.sku ?? ''}</td>
        <td style="padding:4px 8px;">${i.description ?? ''}</td>
        <td style="padding:4px 8px;text-align:center;">${i.quantity ?? ''}</td>
        <td style="padding:4px 8px;text-align:right;">${this.formatMoney(i.unitPrice)}</td>
      </tr>
    `).join('');

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt ${d.transactionId ?? ''}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #222; margin: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { margin-bottom: 12px; color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          td, th { border-bottom: 1px solid #eee; }
          .total { font-weight: 700; font-size: 16px; margin-top: 12px; text-align: right; }
        </style>
      </head>
      <body>
        <h1>Payment Receipt</h1>
        <div class="meta">
          <div>Transaction: ${d.transactionId ?? '-'}</div>
          <div>Date: ${d.createdAt ?? new Date().toLocaleString()}</div>
          <div>Amount: ${this.formatMoney(d.amount)} ${d.currency ?? ''}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;">SKU</th>
              <th style="text-align:left;padding:6px 8px;">Description</th>
              <th style="text-align:center;padding:6px 8px;">Qty</th>
              <th style="text-align:right;padding:6px 8px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="total">TOTAL: ${this.formatMoney(d.amount)} ${d.currency ?? ''}</div>

        <div style="margin-top:18px;font-size:12px;color:#666;">
          Thank you for your purchase.
        </div>
      </body>
      </html>
    `;
  }

  private formatMoney(value: any) {
    if (value == null || value === '') return '-';
    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num)) return String(value);
    // Format to 2 decimal places - adjust locale/currency as needed
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
