import { TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PaymentSuccessDialogComponent } from './payment-success-dialog.component';

describe('PaymentSuccessDialogComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentSuccessDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            transactionId: '<script>alert(1)</script>',
            createdAt: '2026-04-04',
            amount: 10,
            currency: 'USD',
            items: [
              {
                sku: '<b>sku</b>',
                description: '<img src=x onerror=alert(1)>',
                quantity: 1,
                unitPrice: 10
              }
            ]
          }
        }
      ]
    }).compileComponents();
  });

  it('escapes untrusted receipt values before rendering printable HTML', () => {
    const fixture = TestBed.createComponent(PaymentSuccessDialogComponent);
    const component = fixture.componentInstance;
    const html = (component as any).renderReceiptHtml();

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
