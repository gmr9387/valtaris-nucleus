/**
 * X12 Structural Validator
 *
 * Checks the envelope and control-number integrity of a parsed
 * interchange, plus the minimum segment set a transaction type needs to
 * be interpretable downstream. This is NOT full HIPAA 5010 implementation
 * guide validation (no situational-rule or code-list checking) — it
 * catches truncated files, mismatched control numbers, and transactions
 * missing the segments edi-normalizer.ts actually reads.
 */
import type { ParsedX12 } from "./x12-parser";
import { segmentsOfType } from "./x12-parser";

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: IssueSeverity;
  error_code?: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

function checkEnvelopePair(
  parsed: ParsedX12,
  openType: string,
  closeType: string,
  openControlIdx: number,
  closeControlIdx: number,
  issues: ValidationIssue[],
): void {
  const open = segmentsOfType(parsed, openType)[0];
  const close = segmentsOfType(parsed, closeType)[0];

  if (!open) {
    issues.push({
      severity: "error",
      error_code: `MISSING_${openType}`,
      message: `Missing ${openType} segment.`,
    });
    return;
  }
  if (!close) {
    issues.push({
      severity: "error",
      error_code: `MISSING_${closeType}`,
      message: `Missing ${closeType} segment — interchange/group/transaction not properly terminated.`,
    });
    return;
  }

  const openControl = open.elements[openControlIdx]?.trim();
  const closeControl = close.elements[closeControlIdx]?.trim();
  if (openControl && closeControl && openControl !== closeControl) {
    issues.push({
      severity: "error",
      error_code: `${openType}_${closeType}_CONTROL_MISMATCH`,
      message: `${openType} control number "${openControl}" does not match ${closeType} control number "${closeControl}".`,
    });
  }
}

export function validateX12(parsed: ParsedX12): ValidationResult {
  const issues: ValidationIssue[] = [];

  checkEnvelopePair(parsed, "ISA", "IEA", 13, 1, issues);
  checkEnvelopePair(parsed, "GS", "GE", 6, 1, issues);
  checkEnvelopePair(parsed, "ST", "SE", 2, 1, issues);

  const st = segmentsOfType(parsed, "ST")[0];
  const se = segmentsOfType(parsed, "SE")[0];
  if (st && se) {
    const stIdx = parsed.segments.indexOf(st);
    const seIdx = parsed.segments.indexOf(se);
    if (seIdx > stIdx) {
      const actualCount = seIdx - stIdx + 1;
      const declaredCount = Number(se.elements[1]);
      if (Number.isFinite(declaredCount) && declaredCount !== actualCount) {
        issues.push({
          severity: "error",
          error_code: "SE_SEGMENT_COUNT_MISMATCH",
          message: `SE declares ${declaredCount} segments in the transaction set but ${actualCount} were found.`,
        });
      }
    } else {
      issues.push({
        severity: "error",
        error_code: "ST_SE_OUT_OF_ORDER",
        message: "SE segment does not appear after ST segment.",
      });
    }
  }

  const type = parsed.envelope.transaction_type;
  if (type === "835") {
    if (segmentsOfType(parsed, "CLP").length === 0) {
      issues.push({
        severity: "error",
        error_code: "NO_CLP",
        message: "No CLP (claim payment) segments found in an 835 transaction.",
      });
    }
  } else if (type === "837P" || type === "837I") {
    if (segmentsOfType(parsed, "CLM").length === 0) {
      issues.push({
        severity: "error",
        error_code: "NO_CLM",
        message: "No CLM (claim) segments found in an 837 transaction.",
      });
    }
  } else {
    issues.push({
      severity: "warning",
      error_code: "UNRECOGNIZED_TRANSACTION_TYPE",
      message: `Transaction type "${type}" is not one this pipeline normalizes (expected 835, 837P, or 837I).`,
    });
  }

  if (parsed.segments.length === 0) {
    issues.push({
      severity: "error",
      error_code: "EMPTY_INTERCHANGE",
      message: "No segments found in file.",
    });
  }

  const hasBlockingError = issues.some((i) => i.severity === "error");
  return { valid: !hasBlockingError, issues };
}
