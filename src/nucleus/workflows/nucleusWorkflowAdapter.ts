export class NucleusApi {
  private telemetry: NucleusTelemetryAdapter;

  constructor(private app: any, private organizationId: string) {
    this.telemetry = new NucleusTelemetryAdapter(
      organizationId,
      "nucleus-api"
    );

    this.bindRoutes();
  }

  private bindRoutes() {
    bindContractSubsystemRoutes(this.app, this.organizationId);
    bindOpenApiRoutes(this.app);
  }
}
