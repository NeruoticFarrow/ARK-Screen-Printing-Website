// The fifteen Lucide icons the store uses (lucide-react 0.453.0, ISC
// licence), drawn the way lucide-react draws them, so the store needs no icon
// package. Each takes `size` like the lucide components did.

const BASE = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function icon(name, nodes) {
  const kebab = name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  function Icon({ size = 24, className = "", ...rest }) {
    return (
      <svg {...BASE} width={size} height={size} className={["lucide", `lucide-${kebab}`, className].filter(Boolean).join(" ")} {...rest}>
        {nodes.map(([tag, attrs], i) => {
          const Tag = tag;
          return <Tag key={i} {...attrs} />;
        })}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const ArrowRight = icon("ArrowRight", [["path", { d: "M5 12h14" }], ["path", { d: "m12 5 7 7-7 7" }]]);
export const ArrowUpRight = icon("ArrowUpRight", [["path", { d: "M7 7h10v10" }], ["path", { d: "M7 17 17 7" }]]);
export const Check = icon("Check", [["path", { d: "M20 6 9 17l-5-5" }]]);
export const ChevronDown = icon("ChevronDown", [["path", { d: "m6 9 6 6 6-6" }]]);
export const ChevronRight = icon("ChevronRight", [["path", { d: "m9 18 6-6-6-6" }]]);
export const CircleCheck = icon("CircleCheck", [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "m9 12 2 2 4-4" }]]);
export const Copy = icon("Copy", [["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }], ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }]]);
export const Info = icon("Info", [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M12 16v-4" }], ["path", { d: "M12 8h.01" }]]);
export const MapPin = icon("MapPin", [["path", { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" }], ["circle", { cx: "12", cy: "10", r: "3" }]]);
export const Minus = icon("Minus", [["path", { d: "M5 12h14" }]]);
export const Plus = icon("Plus", [["path", { d: "M5 12h14" }], ["path", { d: "M12 5v14" }]]);
export const ShoppingBag = icon("ShoppingBag", [["path", { d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" }], ["path", { d: "M3 6h18" }], ["path", { d: "M16 10a4 4 0 0 1-8 0" }]]);
export const Store = icon("Store", [
  ["path", { d: "m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" }],
  ["path", { d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" }],
  ["path", { d: "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" }],
  ["path", { d: "M2 7h20" }],
  ["path", { d: "M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" }],
]);
export const Truck = icon("Truck", [
  ["path", { d: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" }],
  ["path", { d: "M15 18H9" }],
  ["path", { d: "M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" }],
  ["circle", { cx: "17", cy: "18", r: "2" }],
  ["circle", { cx: "7", cy: "18", r: "2" }],
]);
export const X = icon("X", [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]]);
