# Repository instructions

## Booster coverage

- Board holes do not block booster effects. Firecrackers affect every playable cell in their row or column; area effects affect every playable cell within their geometric footprint, including disconnected cells.
- Apply the same rule to combinations and chain reactions. A projected combination line must still work when its origin lies in a hole.
- Void cells remain untargetable; preserve each booster's established range and tile hit rules.

## Stable level authoring

- Treat gravity exits, edge guides, and mug collectors as one domain contract: every visible guide must correspond to a real terminal in the compiled gravity graph.
- If an outer board side has exit guides, every playable cell along that side must be a real gravity terminal with a matching guide. Do not leave gaps or funnel a wider boundary through only some of its cells.
- A single exit is acceptable only when its gravity region reaches the relevant board boundary through exactly one playable cell.
- For point gravity, keep every authored zone non-empty and continuous, and assign every playable cell to exactly one zone. Split a wide region into continuous subzones when it needs multiple boundary targets.
- For explicit flow gravity, create separate terminal paths or terminal branches instead of adding decorative guides that are not represented in `nextByCell` and `edgeTargets`.
- If a level has a mug objective, create collectors for all of its gravity terminals so mugs can leave through every displayed exit.
- When stable board geometry or gravity changes, increment `CATALOG_LEVEL_REVISION` so saved attempts with an obsolete graph are not restored.
- Cover catalog changes with deterministic compilation/materialization tests and assertions for the intended boundary anchors.
