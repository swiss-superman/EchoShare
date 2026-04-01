export const pollutionCategories = [
  { value: "PLASTIC", label: "Plastic litter" },
  { value: "SOLID_WASTE", label: "Mixed solid waste" },
  { value: "SEWAGE", label: "Sewage discharge" },
  { value: "CHEMICAL", label: "Chemical contamination" },
  { value: "OIL_OR_FUEL", label: "Oil or fuel" },
  { value: "CONSTRUCTION_DEBRIS", label: "Construction debris" },
  { value: "FOAM", label: "Foam and surface scum" },
  { value: "DEAD_FISH", label: "Fish kill or wildlife distress" },
  { value: "INVASIVE_WEEDS", label: "Invasive weed bloom" },
  { value: "MULTIPLE", label: "Multiple categories" },
  { value: "OTHER", label: "Other" },
] as const;

export const severityLevels = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

export const reportStatuses = [
  { value: "NEW", label: "New" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "ACTION_PLANNED", label: "Action planned" },
  { value: "CLEANUP_SCHEDULED", label: "Cleanup scheduled" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export const waterBodyTypes = [
  { value: "LAKE", label: "Lake" },
  { value: "POND", label: "Pond" },
  { value: "BEACH", label: "Beach" },
  { value: "RIVER", label: "River" },
  { value: "CANAL", label: "Canal" },
  { value: "WETLAND", label: "Wetland" },
  { value: "RESERVOIR", label: "Reservoir" },
  { value: "ESTUARY", label: "Estuary" },
  { value: "OTHER", label: "Other" },
] as const;

export const postTypes = [
  { value: "GENERAL", label: "General update" },
  { value: "CLEANUP_CALL", label: "Cleanup call" },
  { value: "UPDATE", label: "Progress update" },
  { value: "ALERT", label: "Alert" },
] as const;

export const organizationTypes = [
  { value: "NGO", label: "NGO" },
  { value: "GOVERNMENT", label: "Government" },
  { value: "COMMUNITY_GROUP", label: "Community group" },
  { value: "ACADEMIC", label: "Academic" },
  { value: "CSR", label: "CSR initiative" },
  { value: "VOLUNTEER_NETWORK", label: "Volunteer network" },
] as const;

export const severityWeights = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
} as const;
