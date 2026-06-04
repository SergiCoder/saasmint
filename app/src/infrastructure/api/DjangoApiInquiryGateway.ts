import type {
  IInquiryGateway,
  InquiryInput,
} from "@/application/ports/IInquiryGateway";
import { publicApiFetchVoid } from "./apiClient";

export class DjangoApiInquiryGateway implements IInquiryGateway {
  async submit(input: InquiryInput): Promise<void> {
    await publicApiFetchVoid("/marketing/inquiries/", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        message: input.message ?? "",
        source: input.source,
        // Server action short-circuits before reaching the gateway when the
        // honeypot was filled, so submissions that get here are always clean.
        honeypot: "",
      }),
    });
  }
}
