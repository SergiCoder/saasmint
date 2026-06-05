import { DomainError } from "./DomainError";

export class NetworkError extends DomainError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "NETWORK_UNREACHABLE", options);
  }
}
