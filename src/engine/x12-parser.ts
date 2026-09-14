/**
 * X12 EDI Parser — generic envelope + segment tokenizer.
 *
 * Handles the structural layer common to every X12 healthcare transaction
 * (ISA/GS/ST envelope, segment/element/sub-element splitting) without
 * knowing anything about what a specific transaction type (835, 837, ...)
 * means. Transaction-specific interpretation lives in edi-normalizer.ts.
 *
 * Delimiter detection follows the standard X12 bootstrap trick: the ISA
 * segment is always exactly 106 bytes (single-character delimiters), so
 * the element separator, component (sub-element) separator, and segment
 * terminator can all be read from fixed positions before anything else
 * is parsed.
 */

export interface X12Segment {
  segment_type: string;
  sequence_number: number;
  raw_segment: string;
  /** Elements in order, element[0] is the segment id itself (e.g. "CLP"). */
  elements: string[];
  parsed_json: { elements: string[] };
}

export interface X12Envelope {
  transaction_type: string; // '835' | '837P' | '837I' | raw ST01 if unrecognized
  sender_id?: string;
  receiver_id?: string;
  interchange_control_number?: string;
  functional_group_number?: string;
  transaction_set_number?: string;
  functional_id_code?: string; // GS01, e.g. 'HP' (835) or 'HC' (837)
  version?: string; // GS08, e.g. '005010X221A1'
}

export interface ParsedX12 {
  envelope: X12Envelope;
  segments: X12Segment[];
  element_separator: string;
  sub_element_separator: string;
  segment_terminator: string;
  file_name?: string;
}

const ISA_FIXED_LENGTH = 106; // "ISA" + 16 delimited elements + terminator, single-char delimiters

export function isLikelyX12(content: string): boolean {
  const trimmed = content.replace(/^\uFEFF/, "").trimStart();
  return trimmed.startsWith("ISA");
}

function splitComposite(element: string, subElementSep: string): string[] | undefined {
  if (!element.includes(subElementSep)) return undefined;
  return element.split(subElementSep);
}

function detectTransactionType(st01: string | undefined, gs08: string | undefined): string {
  if (st01 === "835") return "835";
  if (st01 === "837") {
    const version = (gs08 ?? "").toUpperCase();
    if (version.includes("X223")) return "837I";
    if (version.includes("X222")) return "837P";
    return "837P";
  }
  return st01 ?? "unknown";
}

export function parseX12(content: string, opts: { filename?: string } = {}): ParsedX12 {
  const text = content.replace(/^\uFEFF/, "");
  if (!isLikelyX12(text)) {
    throw new Error(
      "Content does not start with an ISA segment — not a recognizable X12 interchange.",
    );
  }
  if (text.length < ISA_FIXED_LENGTH) {
    throw new Error(`ISA segment truncated: expected at least ${ISA_FIXED_LENGTH} characters.`);
  }

  const elementSeparator = text[3];
  const subElementSeparator = text[104];
  const segmentTerminator = text[105];

  const rawSegments = text
    .split(segmentTerminator)
    .map((s) =>
      s
        .replace(/^[\r\n]+/, "")
        .replace(/[\r\n]+$/, "")
        .trim(),
    )
    .filter((s) => s.length > 0);

  const segments: X12Segment[] = rawSegments.map((raw, i) => {
    const elements = raw.split(elementSeparator);
    return {
      segment_type: elements[0] ?? "",
      sequence_number: i + 1,
      raw_segment: raw,
      elements,
      parsed_json: { elements },
    };
  });

  const isa = segments.find((s) => s.segment_type === "ISA");
  const gs = segments.find((s) => s.segment_type === "GS");
  const st = segments.find((s) => s.segment_type === "ST");

  const envelope: X12Envelope = {
    transaction_type: detectTransactionType(st?.elements[1], gs?.elements[8]),
    sender_id: isa?.elements[6]?.trim() || undefined,
    receiver_id: isa?.elements[8]?.trim() || undefined,
    interchange_control_number: isa?.elements[13]?.trim() || undefined,
    functional_group_number: gs?.elements[6]?.trim() || undefined,
    transaction_set_number: st?.elements[2]?.trim() || undefined,
    functional_id_code: gs?.elements[1]?.trim() || undefined,
    version: gs?.elements[8]?.trim() || undefined,
  };

  return {
    envelope,
    segments,
    element_separator: elementSeparator,
    sub_element_separator: subElementSeparator,
    segment_terminator: segmentTerminator,
    file_name: opts.filename,
  };
}

/** Splits a single element into its components using the interchange's sub-element separator. */
export function componentsOf(parsed: ParsedX12, element: string): string[] {
  return splitComposite(element, parsed.sub_element_separator) ?? [element];
}

/** Finds all segments of a given type, in document order. */
export function segmentsOfType(parsed: ParsedX12, type: string): X12Segment[] {
  return parsed.segments.filter((s) => s.segment_type === type);
}
