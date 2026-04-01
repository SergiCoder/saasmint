import type {
  ISubscriptionGateway,
  CheckoutSessionInput,
} from "@/application/ports/ISubscriptionGateway";

export class StartCheckout {
  constructor(private readonly subscriptions: ISubscriptionGateway) {}

  async execute(input: CheckoutSessionInput): Promise<{ url: string }> {
    return this.subscriptions.createCheckoutSession(input);
  }
}
