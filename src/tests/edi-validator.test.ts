// Regression coverage for validateX12()'s envelope control-number
// checks (src/engine/edi-validator.ts). Previously compared each
// trailer segment's COUNT field (element 1: IEA01/GE01/SE01) against
// the header's control number instead of the trailer's own control
// number (element 2: IEA02/GE02/SE02) -- meaning a real, correctly
// formed X12 file would almost always fail validation, since a count
// like "1" essentially never equals a real control number.

import { describe, it, expect } from "vitest";
import { validateX12 } from "../engine/edi-validator";
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

/** A minimal, well-formed 835 interchange with matching control numbers
 * and correct SE segment count -- this should validate cleanly. */
function wellFormed835(): ParsedX12 {
  const segments: X12Segment[] = [
    // ISA13 = "000000001"
    segment("ISA", [
      "00",
      "          ",
      "00",
      "          ",
      "ZZ",
      "SENDER         ",
      "ZZ",
      "RECEIVER       ",
      "231001",
      "1200",
      "^",
      "00501",
      "000000001",
      "0",
      "P",
      ":",
    ]),
    // GS06 = "1"
    segment("GS", ["HP", "SENDER", "RECEIVER", "20231001", "1200", "1", "X", "005010X221A1"]),
    // ST02 = "0001"
    segment("ST", ["835", "0001"]),
    segment("CLP", ["CLAIM001", "1", "100.00", "80.00", "0", "12", "CTRL001"]),
    // SE01 = 3 (ST + CLP + SE), SE02 = "0001" matches ST02
    segment("SE", ["3", "0001"]),
    // GE01 = 1 (functional group count), GE02 = "1" matches GS06
    segment("GE", ["1", "1"]),
    // IEA01 = 1 (interchange count), IEA02 = "000000001" matches ISA13
    segment("IEA", ["1", "000000001"]),
  ];

  return {
    envelope: { transaction_type: "835" },
    segments,
    element_separator: "*",
    sub_element_separator: ":",
    segment_terminator: "~",
  };
}

describe("validateX12 — envelope control-number matching", () => {
  it("does not falsely flag a control mismatch on a well-formed interchange", () => {
    const result = validateX12(wellFormed835());

    const mismatchCodes = result.issues
      .filter((i) => i.error_code?.endsWith("_CONTROL_MISMATCH"))
      .map((i) => i.error_code);

    // FIXED: previously this always fired for ISA/IEA, GS/GE, and ST/SE
    // because it compared the trailer's count field against the
    // header's control number.
    expect(mismatchCodes).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("still catches a real control-number mismatch", () => {
    const parsed = wellFormed835();
    // Corrupt IEA02 (interchange control number) so it no longer
    // matches ISA13.
    const iea = parsed.segments.find((s) => s.segment_type === "IEA")!;
    iea.elements[2] = "999999999";

    const result = validateX12(parsed);

    expect(result.issues.some((i) => i.error_code === "ISA_IEA_CONTROL_MISMATCH")).toBe(true);
    expect(result.valid).toBe(false);
  });

  it("still catches a genuine SE segment-count mismatch", () => {
    const parsed = wellFormed835();
    const se = parsed.segments.find((s) => s.segment_type === "SE")!;
    se.elements[1] = "99"; // wildly wrong declared count

    const result = validateX12(parsed);

    expect(result.issues.some((i) => i.error_code === "SE_SEGMENT_COUNT_MISMATCH")).toBe(true);
  });
});
