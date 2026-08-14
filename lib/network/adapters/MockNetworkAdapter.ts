import type {
  GrantAccessInput,
  LinkMetrics,
  NetworkAdapter,
  RevokeAccessInput,
  ThrottleConnectionInput,
} from "../NetworkAdapterInterface.js";

export interface MockNetworkAdapterOptions {
  silent?: boolean;
}

export class MockNetworkAdapter implements NetworkAdapter {
  readonly grants: GrantAccessInput[] = [];
  readonly revokes: RevokeAccessInput[] = [];
  readonly throttles: ThrottleConnectionInput[] = [];
  private readonly silent: boolean;

  constructor(options: MockNetworkAdapterOptions = {}) {
    this.silent = options.silent ?? false;
  }

  async grantAccess(input: GrantAccessInput): Promise<void> {
    this.grants.push(input);
    if (!this.silent) {
      console.info(`[mock-adapter] grantAccess session=${input.session.id}`);
    }
  }

  async revokeAccess(input: RevokeAccessInput): Promise<void> {
    this.revokes.push(input);
    if (!this.silent) {
      console.info(
        `[mock-adapter] revokeAccess session=${input.session.id} reason=${input.reason ?? "unspecified"}`,
      );
    }
  }

  async throttleConnection(input: ThrottleConnectionInput): Promise<void> {
    this.throttles.push(input);
    if (!this.silent) {
      console.info(
        `[mock-adapter] throttleConnection session=${input.session.id} down=${input.downloadKbps} up=${input.uploadKbps}`,
      );
    }
  }

  async getLinkMetrics(): Promise<LinkMetrics | null> {
    return { rssi: -50, latencyMs: 12 };
  }
}

export class NoopNetworkAdapter implements NetworkAdapter {
  async grantAccess(): Promise<void> {}
  async revokeAccess(): Promise<void> {}
  async throttleConnection(): Promise<void> {}
}
