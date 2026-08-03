import type { InstrumentEntry } from "../contracts/index.js";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  instrumentId?: string;
}

export interface ValidationOptions {
  // strict=true is the post-W0 mode: an unresolved provider symbol becomes
  // a hard error instead of a warning. Before W0 runs, 18 of the 39 entries
  // are *expected* to be unresolved — hard-failing on that every run would
  // just be noise that trains people to ignore the validator. strict=false
  // (the default) still catches every other doc section 6 failure mode.
  strict?: boolean;
  // Optional external inputs — these two checks depend on data this package
  // doesn't own (W0's live entitlement results, W3's widget references), so
  // they're no-ops unless the caller supplies them. Left wired up rather
  // than silently dropped, so the moment that data exists, plugging it in
  // is a one-line change here, not a rewrite.
  entitledSymbols?: Set<string>; // providerSymbols confirmed entitled by W0
  widgetInstrumentIds?: Set<string>; // instrument ids actually referenced by frontend widgets
}

export function validateRegistry(
  registry: InstrumentEntry[],
  options: ValidationOptions = {}
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const strict = options.strict ?? false;

  // 1. Duplicate IDs.
  const idCounts = new Map<string, number>();
  for (const entry of registry) {
    idCounts.set(entry.id, (idCounts.get(entry.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      issues.push({
        severity: "error",
        code: "duplicate-id",
        message: `Instrument id "${id}" appears ${count} times.`,
        instrumentId: id,
      });
    }
  }

  for (const entry of registry) {
    // 2. Missing provider symbol.
    if (!entry.providerSymbol) {
      if (entry.needsResolution && !strict) {
        issues.push({
          severity: "warning",
          code: "pending-resolution",
          message: `"${entry.id}" has no providerSymbol yet — expected pre-W0, resolve via /symbol_search before going live.`,
          instrumentId: entry.id,
        });
      } else {
        issues.push({
          severity: "error",
          code: "missing-provider-symbol",
          message: entry.needsResolution
            ? `"${entry.id}" is still unresolved and strict mode is on — W0 must resolve this before merge.`
            : `"${entry.id}" has no providerSymbol and is not marked needsResolution — this is a bug, not a pending item.`,
          instrumentId: entry.id,
        });
      }
    }

    // 3. Missing currency.
    if (!entry.currency) {
      issues.push({
        severity: "error",
        code: "missing-currency",
        message: `"${entry.id}" has no currency set.`,
        instrumentId: entry.id,
      });
    }

    // 4. Entitlement — only checkable if the caller supplied W0's results.
    if (options.entitledSymbols && entry.providerSymbol) {
      if (!options.entitledSymbols.has(entry.providerSymbol)) {
        issues.push({
          severity: "error",
          code: "not-entitled",
          message: `"${entry.id}" (${entry.providerSymbol}) is not in the W0-confirmed entitled set.`,
          instrumentId: entry.id,
        });
      }
    }

    // 5. Unregistered widget reference — inverse direction: only checkable
    // if the caller supplied the frontend's actual widget→instrument map.
  }
  if (options.widgetInstrumentIds) {
    const registryIds = new Set(registry.map((e) => e.id));
    for (const widgetId of options.widgetInstrumentIds) {
      if (!registryIds.has(widgetId)) {
        issues.push({
          severity: "error",
          code: "unregistered-widget-reference",
          message: `A widget references "${widgetId}", which is not in the registry.`,
          instrumentId: widgetId,
        });
      }
    }
  }

  // 6. Duplicate instrument (same displaySymbol + assetClass, different id).
  const seenBySymbolClass = new Map<string, string>(); // "assetClass|displaySymbol" -> first id
  for (const entry of registry) {
    const key = `${entry.assetClass}|${entry.displaySymbol.toLowerCase()}`;
    const firstId = seenBySymbolClass.get(key);
    if (firstId && firstId !== entry.id) {
      issues.push({
        severity: "error",
        code: "duplicate-instrument",
        message: `"${entry.id}" and "${firstId}" both represent ${entry.assetClass} "${entry.displaySymbol}".`,
        instrumentId: entry.id,
      });
    } else if (!firstId) {
      seenBySymbolClass.set(key, entry.id);
    }
  }

  return issues;
}

export function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
