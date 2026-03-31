import {Injectable} from '@angular/core';
import {loadStripe, Stripe, StripeElements} from '@stripe/stripe-js';
import {ConfigService} from '../services/config.service';

@Injectable({ providedIn: 'root' })
export class StripeService {
  stripePromise: Promise<Stripe | null>;
  private _elements?: StripeElements;

  constructor(private configService: ConfigService) {
    console.log('stripe public key', this.configService.environment.stripePublicKey);
    this.stripePromise = loadStripe(this.configService.environment.stripePublicKey);
  }

  async getStripe() {
    return this.stripePromise;
  }

  async createElements(): Promise<StripeElements> {
    const stripe = await this.getStripe();
    if (!stripe) throw new Error('Stripe not loaded');
    return stripe.elements(); // returns a new Elements instance each call
  }

  async getElements() {
    if (!this._elements) {
      const stripe = await this.getStripe();
      if (!stripe) throw new Error('Stripe failed to load');
      this._elements = stripe.elements();
    }
    return this._elements;
  }
}
