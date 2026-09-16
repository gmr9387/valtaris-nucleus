import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { canManageOrg, canManageProjects, useMyOrgMembership } from "@/lib/queries";
import { useOrgStore } from "@/lib/org-store";
import { PageHeader, PageBody, EmptyState, StatusPill } from "@/components/platform-ui";
import { Field, Th, Td, FieldStyles } from "./_app.organizations";
import { createCorrelationId, logAudit } from "@/lib/audit";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  listContracts,
  listFeeSchedules,
  createContract,
  addFeeScheduleRow,
} from "@/lib/contracts";
import type { PayerContract } from "@/types/contracts";
import { listPlanBenefits, createPlanBenefit } from "@/lib/plan-benefits";
import type { PlanBenefitRow } from "@/types/plan-benefits";
import { listAllMemberOhi, upsertMemberOhi, deleteMemberOhi } from "@/lib/ohi";
import {
  listAllWeaverRules,
  createWeaverRule,
  setWeaverRuleEnabled,
  deleteWeaverRule,
} from "@/lib/weaver-rules";
import type { WeaverRule, WeaverRuleOperator, WeaverRuleStage } from "@/types/weaver-rules";
import { fetchKillSwitch, setKillSwitch } from "@/lib/guardian-kill-switch";
import {
  listApiClients,
  createApiClient,
  rotateApiClientKey,
  setApiClientEnabled,
} from "@/lib/api-clients";
import type { ApiClient } from "@/types/api-clients";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/_app/contracts")({
  component: ContractsPage,
});

function ContractsPage() {
  return (
    <>
      <PageHeader
        eyebrow="ADJUDICATION DATA"
        title="Contracts & Plans"
        description="Real payer contracts, fee schedules, plan benefits, member OHI, Weaver's decisioning rules, Guardian's kill switch, and the API clients that authenticate external callers — the data and controls the adjudication engine runs on."
      />

      <PageBody>
        <Tabs defaultValue="contracts">
          <TabsList>
            <TabsTrigger value="contracts">Payer Contracts</TabsTrigger>
            <TabsTrigger value="plans">Plan Benefits</TabsTrigger>
            <TabsTrigger value="ohi">Member OHI</TabsTrigger>
            <TabsTrigger value="weaver">Weaver Rules</TabsTrigger>
            <TabsTrigger value="guardian">Guardian Kill Switch</TabsTrigger>
            <TabsTrigger value="api-clients">API Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <ContractsTab />
          </TabsContent>

          <TabsContent value="plans">
            <PlanBenefitsTab />
          </TabsContent>

          <TabsContent value="ohi">
            <MemberOhiTab />
          </TabsContent>

          <TabsContent value="weaver">
            <WeaverRulesTab />
          </TabsContent>

          <TabsContent value="guardian">
            <GuardianKillSwitchTab />
          </TabsContent>

          <TabsContent value="api-clients">
            <ApiClientsTab />
          </TabsContent>
        </Tabs>

        <FieldStyles />
      </PageBody>
    </>
  );
}

// ============================================================
// Payer Contracts + Fee Schedules
// ============================================================

const contractSchema = z.object({
  payer_name: z.string().trim().min(1).max(120),
  provider_npi: z.string().trim().max(20).optional(),
  version: z.string().trim().min(1).max(40),
  effective_date: z.string().min(1),
  termination_date: z.string().optional(),
  reimbursement_method: z.enum(["fee_schedule", "percent_of_billed"]),
  percent_of_billed: z.coerce.number().min(0).max(100).optional(),
});

const feeScheduleSchema = z.object({
  contract_id: z.string().uuid(),
  procedure_code: z.string().trim().min(1).max(20),
  contracted_amount_usd: z.coerce.number().min(0),
});

function ContractsTab() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();
  const membership = useMyOrgMembership(currentOrgId);
  const canCreate = canManageProjects(membership.data?.role);
  const qc = useQueryClient();

  const contracts = useQuery({
    queryKey: ["payer-contracts"],
    queryFn: listContracts,
    staleTime: 15_000,
  });

  const [open, setOpen] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [providerNpi, setProviderNpi] = useState("");
  const [version, setVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [method, setMethod] = useState<"fee_schedule" | "percent_of_billed">("fee_schedule");
  const [percentOfBilled, setPercentOfBilled] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      if (!canCreate) throw new Error("You do not have permission to create contracts.");

      const parsed = contractSchema.parse({
        payer_name: payerName,
        provider_npi: providerNpi || undefined,
        version,
        effective_date: effectiveDate,
        termination_date: terminationDate || undefined,
        reimbursement_method: method,
        percent_of_billed: method === "percent_of_billed" ? percentOfBilled : undefined,
      });

      const correlationId = createCorrelationId();

      const data = await createContract({
        organization_id: currentOrgId,
        payer_name: parsed.payer_name,
        provider_npi: parsed.provider_npi ?? null,
        version: parsed.version,
        effective_date: parsed.effective_date,
        termination_date: parsed.termination_date ?? null,
        reimbursement_method: parsed.reimbursement_method,
        percent_of_billed: parsed.percent_of_billed ?? null,
      });

      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "payer_contract",
        entity_id: data.contract_id,
        action: "create",
        after: data,
        correlation_id: correlationId,
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Contract created");
      setPayerName("");
      setProviderNpi("");
      setVersion("");
      setEffectiveDate("");
      setTerminationDate("");
      setPercentOfBilled("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["payer-contracts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [feeScheduleContractId, setFeeScheduleContractId] = useState<string | null>(null);
  const selectedContractId = feeScheduleContractId ?? contracts.data?.[0]?.contract_id ?? "";

  const feeSchedules = useQuery({
    enabled: !!selectedContractId,
    queryKey: ["fee-schedules", selectedContractId],
    queryFn: () => listFeeSchedules(selectedContractId),
    staleTime: 15_000,
  });

  const [procedureCode, setProcedureCode] = useState("");
  const [contractedAmount, setContractedAmount] = useState("");

  const addRow = useMutation({
    mutationFn: async () => {
      if (!canCreate) throw new Error("You do not have permission to edit fee schedules.");

      const parsed = feeScheduleSchema.parse({
        contract_id: selectedContractId,
        procedure_code: procedureCode,
        contracted_amount_usd: contractedAmount,
      });

      const correlationId = createCorrelationId();

      const data = await addFeeScheduleRow({
        contract_id: parsed.contract_id,
        procedure_code: parsed.procedure_code,
        contracted_amount_cents: Math.round(parsed.contracted_amount_usd * 100),
      });

      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "fee_schedule",
        entity_id: `${parsed.contract_id}:${parsed.procedure_code}`,
        action: "create",
        after: data,
        correlation_id: correlationId,
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Fee schedule row saved");
      setProcedureCode("");
      setContractedAmount("");
      qc.invalidateQueries({ queryKey: ["fee-schedules", selectedContractId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Payer-level or provider-specific reimbursement terms consumed by the adjudication engine.
        </p>

        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!canCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          title={!canCreate ? "Owner, admin, or manager role required" : undefined}
        >
          <Plus className="h-3.5 w-3.5" />
          New contract
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
          className="rounded-lg border border-border bg-surface-1 p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Payer name">
              <input
                className="input"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
                placeholder="Aetna"
              />
            </Field>

            <Field label="Provider NPI (optional)">
              <input
                className="input"
                value={providerNpi}
                onChange={(e) => setProviderNpi(e.target.value)}
                placeholder="Blank = applies to any provider"
              />
            </Field>

            <Field label="Version">
              <input
                className="input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                placeholder="2026.1"
              />
            </Field>

            <Field label="Effective date">
              <input
                type="date"
                className="input"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Termination date (optional)">
              <input
                type="date"
                className="input"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </Field>

            <Field label="Reimbursement method">
              <select
                className="input"
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
              >
                <option value="fee_schedule">fee_schedule</option>
                <option value="percent_of_billed">percent_of_billed</option>
              </select>
            </Field>

            {method === "percent_of_billed" && (
              <Field label="Percent of billed (0-100)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  className="input"
                  value={percentOfBilled}
                  onChange={(e) => setPercentOfBilled(e.target.value)}
                  required
                />
              </Field>
            )}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={create.isPending || !canCreate}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {contracts.data?.length ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
              <tr>
                <Th>Payer</Th>
                <Th>Provider NPI</Th>
                <Th>Version</Th>
                <Th>Effective</Th>
                <Th>Terminates</Th>
                <Th>Method</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-surface-1/40">
              {contracts.data.map((c) => (
                <tr key={c.contract_id} className="hover:bg-surface-2/60">
                  <Td>
                    <span className="font-medium">{c.payer_name}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-muted-foreground">
                      {c.provider_npi ?? "any"}
                    </span>
                  </Td>
                  <Td>{c.version}</Td>
                  <Td>{c.effective_date}</Td>
                  <Td>{c.termination_date ?? "—"}</Td>
                  <Td>
                    {c.reimbursement_method === "percent_of_billed"
                      ? `${c.percent_of_billed ?? 0}% of billed`
                      : "fee schedule"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No payer contracts yet"
          description={canCreate ? "Create one above." : "No contracts are available yet."}
        />
      )}

      {contracts.data?.length ? (
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Fee schedule</h3>

            <select
              className="input max-w-xs"
              value={selectedContractId}
              onChange={(e) => setFeeScheduleContractId(e.target.value)}
            >
              {contracts.data.map((c: PayerContract) => (
                <option key={c.contract_id} value={c.contract_id}>
                  {c.payer_name} · {c.version}
                  {c.provider_npi ? ` · NPI ${c.provider_npi}` : ""}
                </option>
              ))}
            </select>
          </div>

          {feeSchedules.data?.length ? (
            <div className="mb-3 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-mono-xs text-muted-foreground">
                  <tr>
                    <Th>Procedure code</Th>
                    <Th>Contracted amount</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {feeSchedules.data.map((row) => (
                    <tr key={row.procedure_code}>
                      <Td>
                        <span className="font-mono text-xs">{row.procedure_code}</span>
                      </Td>
                      <Td>${(row.contracted_amount_cents / 100).toFixed(2)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              No fee schedule rows for this contract yet.
            </p>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              addRow.mutate();
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <Field label="Procedure code">
              <input
                className="input w-32"
                value={procedureCode}
                onChange={(e) => setProcedureCode(e.target.value)}
                required
                placeholder="99213"
              />
            </Field>

            <Field label="Contracted amount (USD)">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input w-36"
                value={contractedAmount}
                onChange={(e) => setContractedAmount(e.target.value)}
                required
              />
            </Field>

            <button
              type="submit"
              disabled={addRow.isPending || !canCreate}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {addRow.isPending ? "Saving…" : "Add row"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================
// Plan Benefits
// ============================================================

const planBenefitSchema = z.object({
  payer_name: z.string().trim().min(1).max(120),
  plan_name: z.string().trim().min(1).max(120),
  version: z.string().trim().min(1).max(40),
  plan_year: z.coerce.number().int().min(2000).max(2100),
  effective_date: z.string().min(1),
  termination_date: z.string().optional(),
  deductible_individual_usd: z.coerce.number().min(0),
  deductible_family_usd: z.coerce.number().min(0),
  oop_max_individual_usd: z.coerce.number().min(0),
  oop_max_family_usd: z.coerce.number().min(0),
  coinsurance_rate: z.coerce.number().min(0).max(1),
  copay_amount_usd: z.coerce.number().min(0).optional(),
  cob_policy: z.enum(["standard", "non_duplication", "carve_out", "maintenance_of_benefits"]),
});

function PlanBenefitsTab() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();
  const membership = useMyOrgMembership(currentOrgId);
  const canCreate = canManageProjects(membership.data?.role);
  const qc = useQueryClient();

  const plans = useQuery({
    queryKey: ["plan-benefits"],
    queryFn: listPlanBenefits,
    staleTime: 15_000,
  });

  const [open, setOpen] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [planName, setPlanName] = useState("");
  const [version, setVersion] = useState("");
  const [planYear, setPlanYear] = useState(String(new Date().getFullYear()));
  const [effectiveDate, setEffectiveDate] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [deductibleIndividual, setDeductibleIndividual] = useState("0");
  const [deductibleFamily, setDeductibleFamily] = useState("0");
  const [oopMaxIndividual, setOopMaxIndividual] = useState("0");
  const [oopMaxFamily, setOopMaxFamily] = useState("0");
  const [coinsuranceRate, setCoinsuranceRate] = useState("0.2");
  const [copayAmount, setCopayAmount] = useState("");
  const [cobPolicy, setCobPolicy] = useState<
    "standard" | "non_duplication" | "carve_out" | "maintenance_of_benefits"
  >("standard");

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      if (!canCreate) throw new Error("You do not have permission to create plans.");

      const parsed = planBenefitSchema.parse({
        payer_name: payerName,
        plan_name: planName,
        version,
        plan_year: planYear,
        effective_date: effectiveDate,
        termination_date: terminationDate || undefined,
        deductible_individual_usd: deductibleIndividual,
        deductible_family_usd: deductibleFamily,
        oop_max_individual_usd: oopMaxIndividual,
        oop_max_family_usd: oopMaxFamily,
        coinsurance_rate: coinsuranceRate,
        copay_amount_usd: copayAmount || undefined,
        cob_policy: cobPolicy,
      });

      const correlationId = createCorrelationId();

      const data = await createPlanBenefit({
        organization_id: currentOrgId,
        payer_name: parsed.payer_name,
        plan_name: parsed.plan_name,
        version: parsed.version,
        plan_year: parsed.plan_year,
        effective_date: parsed.effective_date,
        termination_date: parsed.termination_date ?? null,
        deductible_individual: Math.round(parsed.deductible_individual_usd * 100),
        deductible_family: Math.round(parsed.deductible_family_usd * 100),
        oop_max_individual: Math.round(parsed.oop_max_individual_usd * 100),
        oop_max_family: Math.round(parsed.oop_max_family_usd * 100),
        coinsurance_rate: parsed.coinsurance_rate,
        copay_amount:
          parsed.copay_amount_usd !== undefined ? Math.round(parsed.copay_amount_usd * 100) : null,
        copay_applies_to: null,
        cob_policy: parsed.cob_policy,
        covered_services: [],
      });

      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "plan_benefit",
        entity_id: data.plan_id,
        action: "create",
        after: data,
        correlation_id: correlationId,
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Plan created");
      setPayerName("");
      setPlanName("");
      setVersion("");
      setEffectiveDate("");
      setTerminationDate("");
      setDeductibleIndividual("0");
      setDeductibleFamily("0");
      setOopMaxIndividual("0");
      setOopMaxFamily("0");
      setCoinsuranceRate("0.2");
      setCopayAmount("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["plan-benefits"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Deductible, out-of-pocket max, coinsurance, copay, and COB policy per plan year.
        </p>

        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!canCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          title={!canCreate ? "Owner, admin, or manager role required" : undefined}
        >
          <Plus className="h-3.5 w-3.5" />
          New plan
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
          className="rounded-lg border border-border bg-surface-1 p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Payer name">
              <input
                className="input"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
                placeholder="Aetna"
              />
            </Field>

            <Field label="Plan name">
              <input
                className="input"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                required
                placeholder="PPO Gold"
              />
            </Field>

            <Field label="Version">
              <input
                className="input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                placeholder="2026.1"
              />
            </Field>

            <Field label="Plan year">
              <input
                type="number"
                className="input"
                value={planYear}
                onChange={(e) => setPlanYear(e.target.value)}
                required
              />
            </Field>

            <Field label="Effective date">
              <input
                type="date"
                className="input"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Termination date (optional)">
              <input
                type="date"
                className="input"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </Field>

            <Field label="Deductible — individual (USD)">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={deductibleIndividual}
                onChange={(e) => setDeductibleIndividual(e.target.value)}
              />
            </Field>

            <Field label="Deductible — family (USD)">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={deductibleFamily}
                onChange={(e) => setDeductibleFamily(e.target.value)}
              />
            </Field>

            <Field label="OOP max — individual (USD)">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={oopMaxIndividual}
                onChange={(e) => setOopMaxIndividual(e.target.value)}
              />
            </Field>

            <Field label="OOP max — family (USD)">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={oopMaxFamily}
                onChange={(e) => setOopMaxFamily(e.target.value)}
              />
            </Field>

            <Field label="Coinsurance rate (0-1)">
              <input
                type="number"
                min={0}
                max={1}
                step="0.01"
                className="input"
                value={coinsuranceRate}
                onChange={(e) => setCoinsuranceRate(e.target.value)}
              />
            </Field>

            <Field label="Copay (USD, optional)">
              <input
                type="number"
                min={0}
                step="0.01"
                className="input"
                value={copayAmount}
                onChange={(e) => setCopayAmount(e.target.value)}
              />
            </Field>

            <Field label="COB policy">
              <select
                className="input"
                value={cobPolicy}
                onChange={(e) => setCobPolicy(e.target.value as typeof cobPolicy)}
              >
                <option value="standard">standard</option>
                <option value="non_duplication">non_duplication</option>
                <option value="carve_out">carve_out</option>
                <option value="maintenance_of_benefits">maintenance_of_benefits</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={create.isPending || !canCreate}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {plans.data?.length ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
              <tr>
                <Th>Payer</Th>
                <Th>Plan</Th>
                <Th>Year</Th>
                <Th>Deductible (ind.)</Th>
                <Th>OOP max (ind.)</Th>
                <Th>Coinsurance</Th>
                <Th>COB policy</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-surface-1/40">
              {plans.data.map((p: PlanBenefitRow) => (
                <tr key={p.plan_id} className="hover:bg-surface-2/60">
                  <Td>
                    <span className="font-medium">{p.payer_name}</span>
                  </Td>
                  <Td>{p.plan_name}</Td>
                  <Td>{p.plan_year}</Td>
                  <Td>${(p.deductible_individual / 100).toFixed(2)}</Td>
                  <Td>${(p.oop_max_individual / 100).toFixed(2)}</Td>
                  <Td>{(p.coinsurance_rate * 100).toFixed(0)}%</Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">{p.cob_policy}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No plans yet"
          description={canCreate ? "Create one above." : "No plans are available yet."}
        />
      )}
    </div>
  );
}

// ============================================================
// Member OHI
// ============================================================

const ohiSchema = z.object({
  member_id: z.string().trim().min(1).max(64),
  payer_id: z.string().trim().min(1).max(64),
  payer_name: z.string().trim().min(1).max(120),
  coverage_type: z.string().trim().min(1).max(60),
  primacy_order: z.coerce.number().int().min(1).optional(),
  subscriber_id: z.string().trim().max(60).optional(),
  group_number: z.string().trim().max(60).optional(),
});

function MemberOhiTab() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();
  const membership = useMyOrgMembership(currentOrgId);
  const canCreate = canManageProjects(membership.data?.role);
  const qc = useQueryClient();

  const ohi = useQuery({
    queryKey: ["member-ohi-all"],
    queryFn: listAllMemberOhi,
    staleTime: 15_000,
  });

  const rows = Object.entries(ohi.data ?? {}).flatMap(([memberId, indicators]) =>
    indicators.map((indicator) => ({ memberId, ...indicator })),
  );

  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [payerId, setPayerId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [coverageType, setCoverageType] = useState("");
  const [primacyOrder, setPrimacyOrder] = useState("");
  const [subscriberId, setSubscriberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      if (!canCreate) throw new Error("You do not have permission to record OHI.");

      const parsed = ohiSchema.parse({
        member_id: memberId,
        payer_id: payerId,
        payer_name: payerName,
        coverage_type: coverageType,
        primacy_order: primacyOrder || undefined,
        subscriber_id: subscriberId || undefined,
        group_number: groupNumber || undefined,
      });

      const correlationId = createCorrelationId();

      await upsertMemberOhi(
        parsed.member_id,
        {
          payer_id: parsed.payer_id,
          payer_name: parsed.payer_name,
          coverage_type: parsed.coverage_type,
          primacy_order: parsed.primacy_order,
          subscriber_id: parsed.subscriber_id,
          group_number: parsed.group_number,
        },
        currentOrgId,
      );

      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "member_ohi",
        entity_id: `${parsed.member_id}:${parsed.payer_id}`,
        action: "create",
        after: parsed,
        correlation_id: correlationId,
      });
    },
    onSuccess: () => {
      toast.success("OHI record saved");
      setMemberId("");
      setPayerId("");
      setPayerName("");
      setCoverageType("");
      setPrimacyOrder("");
      setSubscriberId("");
      setGroupNumber("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["member-ohi-all"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (row: { memberId: string; payer_id: string }) => {
      if (!canCreate) throw new Error("You do not have permission to remove OHI.");
      await deleteMemberOhi(row.memberId, row.payer_id);
      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "member_ohi",
        entity_id: `${row.memberId}:${row.payer_id}`,
        action: "delete",
      });
    },
    onSuccess: () => {
      toast.success("OHI record removed");
      qc.invalidateQueries({ queryKey: ["member-ohi-all"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Other-health-insurance coverage recorded per member — feeds COB primacy resolution.
        </p>

        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!canCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          title={!canCreate ? "Owner, admin, or manager role required" : undefined}
        >
          <Plus className="h-3.5 w-3.5" />
          New OHI record
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
          className="rounded-lg border border-border bg-surface-1 p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Member ID">
              <input
                className="input"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
              />
            </Field>

            <Field label="Payer ID">
              <input
                className="input"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                required
              />
            </Field>

            <Field label="Payer name">
              <input
                className="input"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                required
                placeholder="UnitedHealthcare"
              />
            </Field>

            <Field label="Coverage type">
              <input
                className="input"
                value={coverageType}
                onChange={(e) => setCoverageType(e.target.value)}
                required
                placeholder="employer_group"
              />
            </Field>

            <Field label="Primacy order (optional)">
              <input
                type="number"
                min={1}
                className="input"
                value={primacyOrder}
                onChange={(e) => setPrimacyOrder(e.target.value)}
                placeholder="1 = primary"
              />
            </Field>

            <Field label="Subscriber ID (optional)">
              <input
                className="input"
                value={subscriberId}
                onChange={(e) => setSubscriberId(e.target.value)}
              />
            </Field>

            <Field label="Group number (optional)">
              <input
                className="input"
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={create.isPending || !canCreate}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {rows.length ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
              <tr>
                <Th>Member</Th>
                <Th>Payer</Th>
                <Th>Coverage type</Th>
                <Th>Primacy</Th>
                <Th>Subscriber</Th>
                <Th>Group</Th>
                <Th> </Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-surface-1/40">
              {rows.map((row) => (
                <tr key={`${row.memberId}:${row.payer_id}`} className="hover:bg-surface-2/60">
                  <Td>
                    <span className="font-mono text-xs">{row.memberId}</span>
                  </Td>
                  <Td>{row.payer_name}</Td>
                  <Td>{row.coverage_type}</Td>
                  <Td>{row.primacy_order ?? "—"}</Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {row.subscriber_id ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">{row.group_number ?? "—"}</span>
                  </Td>
                  <Td>
                    <button
                      onClick={() =>
                        remove.mutate({ memberId: row.memberId, payer_id: row.payer_id })
                      }
                      disabled={!canCreate || remove.isPending}
                      className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No OHI records yet"
          description={canCreate ? "Record one above." : "No OHI records are available yet."}
        />
      )}
    </div>
  );
}

// ============================================================
// Weaver Rules
// ============================================================

const WEAVER_OPERATORS: WeaverRuleOperator[] = [
  "exists",
  "not_exists",
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "nonempty_string",
  "nonempty_array",
  "contains",
  "in",
];

const weaverRuleSchema = z.object({
  stage: z.enum(["opportunity", "recommendation"]),
  name: z.string().trim().min(1).max(120),
  field_path: z.string().trim().min(1).max(200),
  operator: z.enum(WEAVER_OPERATORS as [WeaverRuleOperator, ...WeaverRuleOperator[]]),
  value: z.string().optional(),
  weight: z.coerce.number(),
});

function parseWeaverRuleValue(raw: string | undefined): unknown {
  if (!raw || raw.trim() === "") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function WeaverRulesTab() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();
  const membership = useMyOrgMembership(currentOrgId);
  const canCreate = canManageProjects(membership.data?.role);
  const qc = useQueryClient();

  const rules = useQuery({
    queryKey: ["weaver-rules"],
    queryFn: listAllWeaverRules,
    staleTime: 15_000,
  });

  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<WeaverRuleStage>("recommendation");
  const [name, setName] = useState("");
  const [fieldPath, setFieldPath] = useState("");
  const [operator, setOperator] = useState<WeaverRuleOperator>("nonempty_string");
  const [value, setValue] = useState("");
  const [weight, setWeight] = useState("0.1");

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      if (!canCreate) throw new Error("You do not have permission to create rules.");

      const parsed = weaverRuleSchema.parse({
        stage,
        name,
        field_path: fieldPath,
        operator,
        value,
        weight,
      });

      const correlationId = createCorrelationId();

      const data = await createWeaverRule({
        organization_id: currentOrgId,
        stage: parsed.stage,
        name: parsed.name,
        field_path: parsed.field_path,
        operator: parsed.operator,
        value: parseWeaverRuleValue(parsed.value),
        weight: parsed.weight,
      });

      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "weaver_rule",
        entity_id: data.rule_id,
        action: "create",
        after: data,
        correlation_id: correlationId,
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Rule created");
      setName("");
      setFieldPath("");
      setValue("");
      setWeight("0.1");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["weaver-rules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: async (rule: WeaverRule) => {
      if (!canCreate) throw new Error("You do not have permission to edit rules.");
      await setWeaverRuleEnabled(rule.rule_id, !rule.enabled);
      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "weaver_rule",
        entity_id: rule.rule_id,
        action: "update",
        after: { enabled: !rule.enabled },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weaver-rules"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (rule: WeaverRule) => {
      if (!canCreate) throw new Error("You do not have permission to delete rules.");
      await deleteWeaverRule(rule.rule_id);
      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "weaver_rule",
        entity_id: rule.rule_id,
        action: "delete",
      });
    },
    onSuccess: () => {
      toast.success("Rule removed");
      qc.invalidateQueries({ queryKey: ["weaver-rules"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Configurable scoring factors for the opportunity and recommendation stages, added on top
          of the intrinsic amount-based score and 0.4 baseline confidence.
        </p>

        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!canCreate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          title={!canCreate ? "Owner, admin, or manager role required" : undefined}
        >
          <Plus className="h-3.5 w-3.5" />
          New rule
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
          className="rounded-lg border border-border bg-surface-1 p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Stage">
              <select
                className="input"
                value={stage}
                onChange={(e) => setStage(e.target.value as WeaverRuleStage)}
              >
                <option value="opportunity">opportunity</option>
                <option value="recommendation">recommendation</option>
              </select>
            </Field>

            <Field label="Name">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="High-cost procedure bonus"
              />
            </Field>

            <Field label="Field path">
              <input
                className="input"
                value={fieldPath}
                onChange={(e) => setFieldPath(e.target.value)}
                required
                placeholder="claimPayload.amount"
              />
            </Field>

            <Field label="Operator">
              <select
                className="input"
                value={operator}
                onChange={(e) => setOperator(e.target.value as WeaverRuleOperator)}
              >
                {WEAVER_OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Value (JSON, optional)">
              <input
                className="input"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder='0, "text", ["a","b"]'
              />
            </Field>

            <Field label="Weight">
              <input
                type="number"
                step="0.01"
                className="input"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </Field>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={create.isPending || !canCreate}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {rules.data?.length ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
              <tr>
                <Th>Stage</Th>
                <Th>Name</Th>
                <Th>Field path</Th>
                <Th>Operator</Th>
                <Th>Value</Th>
                <Th>Weight</Th>
                <Th>Enabled</Th>
                <Th> </Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-surface-1/40">
              {rules.data.map((rule: WeaverRule) => (
                <tr key={rule.rule_id} className="hover:bg-surface-2/60">
                  <Td>
                    <span className="text-xs text-muted-foreground">{rule.stage}</span>
                  </Td>
                  <Td>
                    <span className="font-medium">{rule.name}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{rule.field_path}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{rule.operator}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-muted-foreground">
                      {rule.value === null || rule.value === undefined
                        ? "—"
                        : JSON.stringify(rule.value)}
                    </span>
                  </Td>
                  <Td>{rule.weight}</Td>
                  <Td>
                    <button
                      onClick={() => toggleEnabled.mutate(rule)}
                      disabled={!canCreate || toggleEnabled.isPending}
                      className="text-xs disabled:opacity-50"
                    >
                      {rule.enabled ? "✓ enabled" : "disabled"}
                    </button>
                  </Td>
                  <Td>
                    <button
                      onClick={() => remove.mutate(rule)}
                      disabled={!canCreate || remove.isPending}
                      className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No Weaver rules yet"
          description={canCreate ? "Create one above." : "No rules are available yet."}
        />
      )}
    </div>
  );
}

// ============================================================
// Guardian Kill Switch
// ============================================================

function GuardianKillSwitchTab() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();
  const membership = useMyOrgMembership(currentOrgId);
  // A kill switch halts all claims processing -- a stricter gate than
  // the other tabs (owner/admin only, not manager).
  const canOperate = canManageOrg(membership.data?.role);
  const qc = useQueryClient();

  const killSwitch = useQuery({
    queryKey: ["guardian-kill-switch"],
    queryFn: fetchKillSwitch,
    staleTime: 5_000,
  });

  const [reason, setReason] = useState("");

  const toggle = useMutation({
    mutationFn: async (nextActive: boolean) => {
      if (!user) throw new Error("You must be signed in.");
      if (!canOperate) throw new Error("You do not have permission to change the kill switch.");
      if (nextActive && !reason.trim()) {
        throw new Error("A reason is required to activate the kill switch.");
      }

      const correlationId = createCorrelationId();

      const data = await setKillSwitch(
        nextActive,
        nextActive ? reason.trim() : null,
        user.email ?? user.id,
      );

      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "guardian_kill_switch",
        entity_id: "global",
        action: "update",
        after: data,
        correlation_id: correlationId,
      });

      return data;
    },
    onSuccess: (data) => {
      toast.success(
        data.active
          ? "Kill switch ACTIVATED — claims processing is halted"
          : "Kill switch deactivated",
      );
      setReason("");
      qc.invalidateQueries({ queryKey: ["guardian-kill-switch"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const isActive = killSwitch.data?.active ?? false;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        A global circuit breaker: when active, Guardian denies every claim before any adjudication
        work runs. Checked first on every authorization, and fails closed (denies) if its state
        can't be verified.
      </p>

      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <StatusPill status={isActive ? "failed" : "active"}>
          {isActive ? "ACTIVE — CLAIMS HALTED" : "OFF"}
        </StatusPill>

        {killSwitch.data?.reason && (
          <p className="mt-2 text-sm text-muted-foreground">Reason: {killSwitch.data.reason}</p>
        )}

        {isActive && killSwitch.data?.activated_by && (
          <p className="text-xs text-muted-foreground">
            Activated by {killSwitch.data.activated_by}
          </p>
        )}

        {!isActive ? (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Field label="Reason for activating">
              <input
                className="input w-80"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. suspected bad contract data feeding adjudication"
              />
            </Field>

            <button
              onClick={() => toggle.mutate(true)}
              disabled={!canOperate || toggle.isPending}
              className="h-9 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              title={!canOperate ? "Owner or admin role required" : undefined}
            >
              {toggle.isPending ? "Activating…" : "Activate kill switch"}
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <button
              onClick={() => toggle.mutate(false)}
              disabled={!canOperate || toggle.isPending}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              title={!canOperate ? "Owner or admin role required" : undefined}
            >
              {toggle.isPending ? "Deactivating…" : "Deactivate kill switch"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// API Clients
// ============================================================

const apiClientSchema = z.object({
  client_id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/,
      "3-64 lowercase letters/digits/hyphens, not starting or ending with a hyphen",
    ),
  label: z.string().trim().min(1).max(120),
});

function ApiClientsTab() {
  const { currentOrgId } = useOrgStore();
  const { user } = useAuth();
  const membership = useMyOrgMembership(currentOrgId);
  // Gated the same as the kill switch, not the more permissive
  // owner/admin/manager bar the other tabs use: api_clients isn't
  // scoped to this org at all -- its keys gate every external caller
  // of nucleus's entire external API surface.
  const canOperate = canManageOrg(membership.data?.role);
  const qc = useQueryClient();

  const clients = useQuery({
    queryKey: ["api-clients"],
    queryFn: listApiClients,
    staleTime: 15_000,
  });

  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [label, setLabel] = useState("");
  const [revealed, setRevealed] = useState<{ clientId: string; rawKey: string } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      if (!canOperate) throw new Error("You do not have permission to create API clients.");

      const parsed = apiClientSchema.parse({ client_id: clientId, label });
      const correlationId = createCorrelationId();

      const { client, rawKey } = await createApiClient({
        ...parsed,
        organization_id: currentOrgId,
      });

      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "api_client",
        entity_id: client.client_id,
        action: "create",
        after: { client_id: client.client_id, label: client.label },
        correlation_id: correlationId,
      });

      return { client, rawKey };
    },
    onSuccess: ({ client, rawKey }) => {
      toast.success(`API client "${client.client_id}" created`);
      setRevealed({ clientId: client.client_id, rawKey });
      setClientId("");
      setLabel("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["api-clients"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rotate = useMutation({
    mutationFn: async (client: ApiClient) => {
      if (!canOperate) throw new Error("You do not have permission to rotate keys.");
      const rawKey = await rotateApiClientKey(client.client_id);
      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "api_client",
        entity_id: client.client_id,
        action: "update",
        after: { rotated: true },
      });
      return { clientId: client.client_id, rawKey };
    },
    onSuccess: ({ clientId, rawKey }) => {
      toast.success(`Key rotated for "${clientId}" — the old key stopped working immediately`);
      setRevealed({ clientId, rawKey });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleEnabled = useMutation({
    mutationFn: async (client: ApiClient) => {
      if (!canOperate) throw new Error("You do not have permission to change API clients.");
      await setApiClientEnabled(client.client_id, !client.enabled);
      await logAudit({
        organization_id: currentOrgId,
        module: "claims",
        entity_type: "api_client",
        entity_id: client.client_id,
        action: "update",
        after: { enabled: !client.enabled },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-clients"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Credentials for external services calling nucleus's own APIs (adjudicate-claim,
        weaver-score, guardian-status) via the <code>x-api-key</code> header. One key per caller —
        DualPay Core Ledger, valtaris-glue, and any future arm each get their own, so any one can be
        revoked without affecting the others.
      </p>

      {revealed && (
        <Alert>
          <AlertTitle>Copy this key now — it won't be shown again</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              New key for <span className="font-mono font-medium">{revealed.clientId}</span>. Only
              its SHA-256 hash is stored — this is the only time the raw value is ever displayed.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 select-all break-all rounded bg-surface-2 px-2 py-1.5 text-xs">
                {revealed.rawKey}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(revealed.rawKey);
                  toast.success("Copied");
                }}
                className="h-8 shrink-0 rounded-md border border-border bg-surface-1 px-2.5 text-xs hover:bg-surface-3"
              >
                Copy
              </button>
              <button
                onClick={() => setRevealed(null)}
                className="h-8 shrink-0 rounded-md border border-border bg-surface-1 px-2.5 text-xs hover:bg-surface-3"
              >
                Dismiss
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <span />
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={!canOperate}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          title={!canOperate ? "Owner or admin role required" : undefined}
        >
          <Plus className="h-3.5 w-3.5" />
          New client
        </button>
      </div>

      {open && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
          className="rounded-lg border border-border bg-surface-1 p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Client ID">
              <input
                className="input font-mono"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                placeholder="valtaris-glue"
              />
            </Field>

            <Field label="Label">
              <input
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
                placeholder="Valtaris Glue Operator Console"
              />
            </Field>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md border border-border bg-surface-2 px-3 text-sm hover:bg-surface-3"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={create.isPending || !canOperate}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {clients.data?.length ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-mono-xs text-muted-foreground">
              <tr>
                <Th>Client ID</Th>
                <Th>Label</Th>
                <Th>Organization</Th>
                <Th>Created</Th>
                <Th>Enabled</Th>
                <Th> </Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border bg-surface-1/40">
              {clients.data.map((client) => (
                <tr key={client.client_id} className="hover:bg-surface-2/60">
                  <Td>
                    <span className="font-mono text-xs font-medium">{client.client_id}</span>
                  </Td>
                  <Td>{client.label}</Td>
                  <Td>
                    {client.organization_id ? (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {client.organization_id}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">— unscoped —</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString()}
                    </span>
                  </Td>
                  <Td>
                    <button
                      onClick={() => toggleEnabled.mutate(client)}
                      disabled={!canOperate || toggleEnabled.isPending}
                      className="text-xs disabled:opacity-50"
                    >
                      {client.enabled ? "✓ enabled" : "disabled"}
                    </button>
                  </Td>
                  <Td>
                    <button
                      onClick={() => rotate.mutate(client)}
                      disabled={!canOperate || rotate.isPending}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                      title="Generate a new key — the old one stops working immediately"
                    >
                      Rotate key
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No API clients yet"
          description={canOperate ? "Create one above." : "No API clients are available yet."}
        />
      )}
    </div>
  );
}
