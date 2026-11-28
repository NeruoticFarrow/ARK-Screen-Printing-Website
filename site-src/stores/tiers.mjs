// ARK's garment tiers for fundraising stores (Alex, 2026-11-28). Sample
// stores show the Premium blanks; the internal pricing table
// (tools/cost-table.mjs) prices every product on both tiers so the nonprofit
// can choose. Styles are ark-designer product ids (client/src/lib/products.ts),
// where the wholesale cost comes from.
//
// Standard is ark-designer's "Mid-Range" tier (Next Level, Independent
// Trading Co., Liberty Bags here). Notes on the picks:
// - Long sleeve: Next Level 3601, the long-sleeve 3600. (6411 is Next Level's
//   sueded short-sleeve tee.)
// - Crewneck: Independent Trading SS3000 isn't in ARK's catalogue yet, so the
//   table uses IND3000, Independent's heavyweight crew, until it is.
// - Standard retail is set so the org keeps about what it keeps on Premium:
//   the supporter pays less, the fundraiser earns the same. ARK bills a blank
//   at twice wholesale, so the gap is about 2 × the wholesale difference.
// - Tote: Liberty Bags 8501 Katelyn, 12 oz cotton canvas with gussets.
export const TIERS = {
  tee: {
    premium: { style: "5001", label: "AS Colour Staple Tee" },
    standard: { style: "00618", label: "Next Level 3600", retailCents: 2699 },
  },
  longsleeve: {
    premium: { style: "5020", label: "AS Colour Staple L/S Tee" },
    standard: { style: "05618", label: "Next Level 3601", retailCents: 2999 },
  },
  hoodie: {
    premium: { style: "5102", label: "AS Colour Stencil Hood" },
    standard: { style: "05176", label: "Independent Trading IND4000", retailCents: 6899 },
  },
  crew: {
    premium: { style: "5103", label: "AS Colour Stencil Crew" },
    standard: { style: "04076", label: "Independent Trading IND3000", retailCents: 5999 },
  },
  tote: {
    premium: { style: "1001", label: "AS Colour Carrie Tote" },
    standard: { style: "LB8501", label: "Liberty Bags 8501 Katelyn", retailCents: 1799 },
  },
};
