// Regression coverage for normalize835()'s CAS segment parsing
// (src/engine/edi-normalizer.ts) -- previously misread the X12 CAS
// segment layout, silently dropping adjustment amounts whenever a
// remittance reported more than one adjustment reason in a single CAS
// segment (extremely common in real 835s).

import { describe, it, expect } from "vitest";
import { normalize835 } from "../engine/edi-normalizer";
import type { ParsedX12, X12Segment } from "../engine/x12-parser";

function segment(segmentType: string, elements: string[]): X12Segment {
  return {
    segment_type: segmentType,
    sequence_number: 0,
    raw_segment: elements.join("*"),
    elements: [segmentType, ...elements],
    parsed_json: { elements: [segmentType, ...elements] },
  };
}

function makeParsed(segments: X12Segment[]): ParsedX12 {
  return {
    envelope: { transaction_type: "835" },
    segments,
    element_separator: "*",
    sub_element_separator: ":",
    segment_terminator: "~",
  };
}

describe("normalize835 — CAS segment parsing", () => {
  it("sums ALL CO-group adjustment amounts when a CAS segment reports multiple reasons", () => {
    // Real X12 835 CAS layout: CAS01 is the group code, appearing ONCE.
    // What follows is up to 6 repeating (reason, amount, quantity)
    // triples: CAS02-04, CAS05-07, CAS08-10, etc. This segment reports
    // two CO (contractual) adjustments in one CAS: $15.00 (reason 45,
    // quantity blank) and $5.00 (reason 96, quantity blank).
    const segments = [
      segment("N1", ["PR", "Test Payer"]),
      segment("CLP", ["CLAIM001", "1", "100.00", "80.00", "0", "12", "CTRL001"]),
      segment("CAS", ["CO", "45", "15.00", "", "96", "5.00", ""]),
    ];

    const [remittance] = normalize835(makeParsed(segments));

    // FIXED: previously only captured the first adjustment ($15) because
    // it misread CAS04 (quantity, empty here) as a second "group code",
    // which didn't match "CO" and silently dropped the $5 adjustment.
    expect(remittance.adjustment_cents).toBe(2000); // $15 + $5 = 2000 cents
    expect(remittance.allowed_cents).toBe(8000); // billed(10000) - adjustment(2000)
    expect(remittance.carc_code).toBe("45"); // primary (first) reason
    expect(remittance.group_code).toBe("CO");
  });

  it("does not count PR (patient responsibility) adjustments as contractual", () => {
    const segments = [
      segment("N1", ["PR", "Test Payer"]),
      segment("CLP", ["CLAIM002", "1", "100.00", "70.00", "10.00", "12", "CTRL002"]),
      segment("CAS", ["PR", "1", "10.00"]),
      segment("CAS", ["CO", "45", "20.00"]),
    ];

    const [remittance] = normalize835(makeParsed(segments));

    // Only the CO segment's $20 counts toward the contractual
    // adjustment; the PR segment's $10 (patient responsibility) does not.
    expect(remittance.adjustment_cents).toBe(2000);
    expect(remittance.allowed_cents).toBe(8000); // 10000 - 2000
  });

  it("handles a single-adjustment CAS segment (no quantity, no second reason) unchanged", () => {
    const segments = [
      segment("N1", ["PR", "Test Payer"]),
      segment("CLP", ["CLAIM003", "1", "50.00", "50.00", "0", "12", "CTRL003"]),
    ];

    const [remittance] = normalize835(makeParsed(segments));

    expect(remittance.adjustment_cents).toBe(0);
    expect(remittance.allowed_cents).toBe(5000);
  });
});
