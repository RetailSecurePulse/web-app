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
    const html = this.renderReceiptHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const receiptUrl = globalThis.URL.createObjectURL(blob);
    const w = globalThis.open(receiptUrl, '_blank', 'noopener,noreferrer');
    if (!w) {
      globalThis.URL.revokeObjectURL(receiptUrl);
      alert('Popup blocked. Please allow popups to print the receipt.');
      return;
    }

    setTimeout(() => {
      w.focus();
      w.print();
      setTimeout(() => globalThis.URL.revokeObjectURL(receiptUrl), 1000);
    }, 250);
  }

  private renderReceiptHtml(): string {
    const d = this.data || {};
    const transactionId = this.escapeHtml(d.transactionId ?? '-');
    const createdAt = this.escapeHtml(d.createdAt ?? new Date().toLocaleString());
    const amount = this.escapeHtml(this.formatMoney(d.amount));
    const currency = this.escapeHtml(d.currency ?? '');
    const itemsHtml = (d.items || []).map(i => `
      <tr>
        <td style="padding:4px 8px;">${this.escapeHtml(i.sku ?? '')}</td>
        <td style="padding:4px 8px;">${this.escapeHtml(i.description ?? '')}</td>
        <td style="padding:4px 8px;text-align:center;">${this.escapeHtml(i.quantity ?? '')}</td>
        <td style="padding:4px 8px;text-align:right;">${this.escapeHtml(this.formatMoney(i.unitPrice))}</td>
      </tr>
    `).join('');

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt ${transactionId}</title>
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
          <div>Transaction: ${transactionId}</div>
          <div>Date: ${createdAt}</div>
          <div>Amount: ${amount} ${currency}</div>
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

        <div class="total">TOTAL: ${amount} ${currency}</div>

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

  private escapeHtml(value: unknown): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
