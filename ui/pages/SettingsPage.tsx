import React from "react";
import { DashboardShell } from "../navigation/DashboardShell";
import { Panel } from "../dashboard/Panel";
import { Form } from "../forms/Form";
import { Field } from "../forms/Field";
import { Label } from "../forms/Label";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

export const SettingsPage = ({ navItems, active, onSelect, form }) => {
  return (
    <DashboardShell navItems={navItems} active={active} onSelect={onSelect}>
      <Panel title="Settings">
        <Form onSubmit={form.onSubmit}>
          <Field label={<Label>Organization Name</Label>} error={form.errors.name}>
            <Input value={form.values.name} onChange={(v) => form.set("name", v)} />
          </Field>

          <Button variant="primary">Save</Button>
        </Form>
      </Panel>
    </DashboardShell>
  );
};
