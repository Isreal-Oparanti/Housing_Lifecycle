/**
 * Every figure TrueCost shows carries where it came from and how far it can be
 * trusted (PRD §9: "A user should never confuse an estimated utility cost with an
 * official bill").
 */
export type Confidence =
  /** From an authoritative public record that applies to this exact property or area. */
  | "official"
  /** Stated by a third party such as a letting agent. Plausible but unverified. */
  | "reported"
  /** Typed in by the renter. */
  | "user_provided"
  /** Derived by TrueCost from averages or statistics. Shown as a range where possible. */
  | "estimated";

export interface Source {
  /** e.g. "Council Tax levels set by local authorities in England 2026 to 2027, Table 10" */
  name: string;
  /** e.g. "Ministry of Housing, Communities and Local Government" */
  publisher: string;
  url?: string;
  licence?: string;
}

export interface Sourced<T> {
  value: T;
  confidence: Confidence;
  /** Omitted only when confidence is "user_provided": the renter is the source. */
  source?: Source;
  /** Plain-English caveat to show next to the figure. */
  note?: string;
}
