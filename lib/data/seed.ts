import type {
  Brand,
  MiniBoStore,
  Product,
  ReportTemplate,
  RequiredRow,
  Shift,
  UserSummary
} from "@/lib/types";

const now = "2026-04-01";

export const brands: Brand[] = [
  { code: "TEMRY", name: "تمري", type: "both", color: "#2E7D32", icon: "🌿" },
  { code: "DAKAHLIA", name: "دقهلية", type: "both", color: "#0277BD", icon: "❄️" },
  { code: "Marinated TEMRY", name: "تمري متبل", type: "both", color: "#8D6E63", icon: "🧂" },
  { code: "DAR", name: "الدار", type: "frozen", color: "#3949AB", icon: "❄️" },
  { code: "KFC", name: "كنتاكي", type: "frozen", color: "#C62828", icon: "🍗" },
  { code: "TOPVALUE", name: "توب فاليو", type: "frozen", color: "#1565C0", icon: "📦" },
  { code: "AGRI HOUSE", name: "أجري هاوس", type: "frozen", color: "#00897B", icon: "🏠" },
  { code: "OUTSOURCES", name: "خارجي/مذبوح", type: "fresh", color: "#6D4C41", icon: "🚚" },
  { code: "SLH", name: "خط الذبح", type: "special", color: "#5D4037", icon: "🐔" },
  { code: "ALL", name: "عام", type: "special", color: "#455A64", icon: "🧩" }
];

export const shifts: Shift[] = [
  {
    id: "shift-morning",
    name: "وردية الصباح",
    startTime: "08:00",
    endTime: "16:00",
    hoursCount: 8,
    allowedBrandCodes: ["TEMRY", "DAKAHLIA", "Marinated TEMRY", "OUTSOURCES", "DAR", "KFC"]
  },
  {
    id: "shift-evening",
    name: "وردية المساء",
    startTime: "16:00",
    endTime: "00:00",
    hoursCount: 8,
    allowedBrandCodes: ["TEMRY", "DAKAHLIA", "DAR", "TOPVALUE", "AGRI HOUSE"]
  }
];

export const reportTemplates: ReportTemplate[] = [
  {
    id: "fresh",
    name: "تقرير الفريش",
    nameEn: "Fresh Report",
    description: "يركز على أصناف FR مع براندات الفريش والذبح الخارجي.",
    filterStatus: "FR",
    brandCodes: ["TEMRY", "DAKAHLIA", "Marinated TEMRY", "OUTSOURCES"],
    icon: "🌿",
    color: "#2E7D32"
  },
  {
    id: "frozen",
    name: "تقرير المجمد",
    nameEn: "Frozen Report",
    description: "يركز على أصناف FZ مع البراندات المجمدة.",
    filterStatus: "FZ",
    brandCodes: ["TEMRY", "DAKAHLIA", "Marinated TEMRY", "DAR", "KFC", "TOPVALUE", "AGRI HOUSE"],
    icon: "❄️",
    color: "#0277BD"
  }
];

export const products: Product[] = [
  {
    id: "prd-001",
    name: "تمري فريش فيلية 1كجم",
    code: "TM-FR-FILET-1",
    unit: "كجم",
    conversionFactor: 1,
    brandCode: "TEMRY",
    status: "FR",
    subGroup: "FILET",
    mainGroup: "FILET",
    customGroup: "Premium",
    isActive: true
  },
  {
    id: "prd-002",
    name: "تمري فريش شيش 1كجم",
    code: "TM-FR-SHISH-1",
    unit: "كجم",
    conversionFactor: 1,
    brandCode: "TEMRY",
    status: "FR",
    subGroup: "SHISH",
    mainGroup: "FILET",
    customGroup: "Premium",
    isActive: true
  },
  {
    id: "prd-003",
    name: "تمري كامل 1000-1100",
    code: "TM-FR-WHC-10",
    unit: "عدد",
    conversionFactor: 1.05,
    brandCode: "TEMRY",
    status: "FR",
    subGroup: "WHC",
    mainGroup: "WHC",
    customGroup: "Whole Chicken",
    isActive: true
  },
  {
    id: "prd-004",
    name: "دقهلية مجمد ونج 900جم",
    code: "DK-FZ-WING-09",
    unit: "كجم",
    conversionFactor: 0.9,
    brandCode: "DAKAHLIA",
    status: "FZ",
    subGroup: "WING",
    mainGroup: "WING",
    isActive: true
  },
  {
    id: "prd-005",
    name: "دقهلية مجمد دبوس 1كجم",
    code: "DK-FZ-DRUMS-1",
    unit: "كجم",
    conversionFactor: 1,
    brandCode: "DAKAHLIA",
    status: "FZ",
    subGroup: "DRUMS",
    mainGroup: "LEG",
    isActive: true
  },
  {
    id: "prd-006",
    name: "تمري متبل شاورما 1كجم",
    code: "MT-FZ-SHAW-1",
    unit: "كجم",
    conversionFactor: 1,
    brandCode: "Marinated TEMRY",
    status: "FZ",
    subGroup: "SHAWERMA",
    mainGroup: "FILET",
    isActive: true
  },
  {
    id: "prd-007",
    name: "الدار مجمد بانيه 1كجم",
    code: "DAR-FZ-STRIPS-1",
    unit: "كجم",
    conversionFactor: 1,
    brandCode: "DAR",
    status: "FZ",
    subGroup: "STRIPS",
    mainGroup: "FILET",
    isActive: true
  },
  {
    id: "prd-008",
    name: "كنتاكي مجمد فيلية 700جم",
    code: "KFC-FZ-FILET-07",
    unit: "كجم",
    conversionFactor: 0.7,
    brandCode: "KFC",
    status: "FZ",
    subGroup: "FILET",
    mainGroup: "FILET",
    isActive: true
  },
  {
    id: "prd-009",
    name: "خارجي فريش كبد وقوانص",
    code: "OUT-FR-LG-1",
    unit: "كجم",
    conversionFactor: 1,
    brandCode: "OUTSOURCES",
    status: "FR",
    subGroup: "LIVER&GIZZARDS",
    mainGroup: "LIVER&GIZZARDS",
    isActive: true
  },
  {
    id: "prd-010",
    name: "خط الذبح عظام",
    code: "SLH-BONES-1",
    unit: "كجم",
    conversionFactor: 1,
    brandCode: "SLH",
    status: "SLH",
    subGroup: "SLH",
    mainGroup: "SLH",
    isActive: true
  }
];

export const users: UserSummary[] = [
  {
    id: "usr-admin",
    username: "admin",
    fullName: "مدير النظام",
    role: "Administrator",
    permissions: ["dashboard:view", "entry:view", "entry:create", "entry:edit", "entry:submit", "approval:view", "approval:approve", "required:view", "required:upload", "admin:users", "admin:products", "admin:reports"]
  },
  {
    id: "usr-supervisor",
    username: "supervisor",
    fullName: "مشرف الإنتاج",
    role: "Supervisor",
    permissions: ["dashboard:view", "entry:view", "entry:create", "entry:edit", "entry:submit", "approval:view"]
  }
];

export const requiredRows: RequiredRow[] = [
  {
    id: "req-1",
    customerName: "هايبر مصر",
    orderState: "قيد التنفيذ",
    productCode: "TM-FR-FILET-1",
    productName: "تمري فريش فيلية 1كجم",
    requiredQty: 220,
    actualQty: 195,
    warehouseName: "مخزن القاهرة",
    comment: "نقص 25 عبوة عن المطلوب"
  },
  {
    id: "req-2",
    customerName: "كارفور",
    orderState: "جاهز للشحن",
    productCode: "TM-FR-SHISH-1",
    productName: "تمري فريش شيش 1كجم",
    requiredQty: 120,
    actualQty: 125,
    warehouseName: "مخزن الجيزة"
  },
  {
    id: "req-3",
    customerName: "سبينيس",
    orderState: "قيد المراجعة",
    productCode: "DK-FZ-DRUMS-1",
    productName: "دقهلية مجمد دبوس 1كجم",
    requiredQty: 160,
    actualQty: 148,
    warehouseName: "مخزن الإسكندرية",
    comment: "يوجد عجز بسيط"
  }
];

export const seedStore: MiniBoStore = {
  brands,
  products,
  shifts,
  reportTemplates,
  requiredRows,
  users,
  sessions: [
    {
      id: "session-temry-morning",
      shiftId: "shift-morning",
      brandCode: "TEMRY",
      reportType: "fresh",
      sessionDate: now,
      startedBy: "usr-supervisor",
      startedAt: `${now}T08:00:00.000Z`,
      status: "submitted",
      approvers: ["مدير الإنتاج", "مدير الجودة"],
      rows: [
        { id: "row-1", productId: "prd-001", quantityCartons: 195, quantityKg: 195, updatedAt: `${now}T11:00:00.000Z` },
        { id: "row-2", productId: "prd-002", quantityCartons: 125, quantityKg: 125, updatedAt: `${now}T11:00:00.000Z` },
        { id: "row-3", productId: "prd-003", quantityCartons: 42, quantityKg: 44.1, updatedAt: `${now}T11:00:00.000Z` },
        { id: "row-4", quantityCartons: 0, quantityKg: 0 }
      ],
      notes: [
        {
          id: "note-1",
          productId: "prd-001",
          quantityKg: 48,
          noteTime: "10:00",
          noteText: "توقف ماكينة لمدة 15 دقيقة",
          createdAt: `${now}T10:00:00.000Z`
        }
      ],
      history: [
        { id: "hist-1", productId: "prd-001", quantityCartons: 45, quantityKg: 45, recordedAt: `${now}T08:30:00.000Z` },
        { id: "hist-2", productId: "prd-001", quantityCartons: 95, quantityKg: 95, recordedAt: `${now}T09:20:00.000Z` },
        { id: "hist-3", productId: "prd-001", quantityCartons: 143, quantityKg: 143, recordedAt: `${now}T10:15:00.000Z` },
        { id: "hist-4", productId: "prd-001", quantityCartons: 195, quantityKg: 195, recordedAt: `${now}T11:05:00.000Z` },
        { id: "hist-5", productId: "prd-002", quantityCartons: 30, quantityKg: 30, recordedAt: `${now}T08:40:00.000Z` },
        { id: "hist-6", productId: "prd-002", quantityCartons: 58, quantityKg: 58, recordedAt: `${now}T09:35:00.000Z` },
        { id: "hist-7", productId: "prd-002", quantityCartons: 93, quantityKg: 93, recordedAt: `${now}T10:25:00.000Z` },
        { id: "hist-8", productId: "prd-002", quantityCartons: 125, quantityKg: 125, recordedAt: `${now}T11:10:00.000Z` },
        { id: "hist-9", productId: "prd-003", quantityCartons: 10, quantityKg: 10.5, recordedAt: `${now}T08:50:00.000Z` },
        { id: "hist-10", productId: "prd-003", quantityCartons: 24, quantityKg: 25.2, recordedAt: `${now}T09:45:00.000Z` },
        { id: "hist-11", productId: "prd-003", quantityCartons: 33, quantityKg: 34.65, recordedAt: `${now}T10:35:00.000Z` },
        { id: "hist-12", productId: "prd-003", quantityCartons: 42, quantityKg: 44.1, recordedAt: `${now}T11:15:00.000Z` }
      ]
    },
    {
      id: "session-dakahalia-evening",
      shiftId: "shift-evening",
      brandCode: "DAKAHLIA",
      reportType: "frozen",
      sessionDate: now,
      startedBy: "usr-supervisor",
      startedAt: `${now}T16:10:00.000Z`,
      status: "open",
      approvers: ["مدير التجميد"],
      rows: [
        { id: "row-5", productId: "prd-004", quantityCartons: 84, quantityKg: 75.6, updatedAt: `${now}T18:00:00.000Z` },
        { id: "row-6", productId: "prd-005", quantityCartons: 148, quantityKg: 148, updatedAt: `${now}T18:00:00.000Z` },
        { id: "row-7", quantityCartons: 0, quantityKg: 0 }
      ],
      notes: [],
      history: [
        { id: "hist-13", productId: "prd-004", quantityCartons: 42, quantityKg: 37.8, recordedAt: `${now}T16:40:00.000Z` },
        { id: "hist-14", productId: "prd-004", quantityCartons: 84, quantityKg: 75.6, recordedAt: `${now}T17:45:00.000Z` },
        { id: "hist-15", productId: "prd-005", quantityCartons: 73, quantityKg: 73, recordedAt: `${now}T16:50:00.000Z` },
        { id: "hist-16", productId: "prd-005", quantityCartons: 148, quantityKg: 148, recordedAt: `${now}T17:55:00.000Z` }
      ]
    }
  ]
};

export const loginUsers = [
  {
    username: "admin",
    password: "1234",
    user: users[0]
  },
  {
    username: "supervisor",
    password: "1234",
    user: users[1]
  }
];
