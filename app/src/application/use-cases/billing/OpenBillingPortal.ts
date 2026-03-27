import type {
  ISubscriptionGateway,
  BillingPortalInput,
} from "@/application/ports/ISubscriptionGateway";

export class OpenBillingPortal {
  constructor(private readonly subscriptions: ISubscriptionGateway) {}

  async execute(input: BillingPortalInput): Promise<{ url: string }> {
    return this.subscriptions.createBillingPortalSession(input);
  }
}
