import type { OrganizationType, VerificationStatus } from "@prisma/client";

export type OrganizationMetadata = {
  issueFocus: string[];
  responseModes: string[];
  sourceUrl: string;
  sourceLabel: string;
  officeAddress?: string;
  volunteerUrl?: string;
  complaintUrl?: string;
  notes?: string;
};

export type RealOrganizationRecord = {
  slug: string;
  name: string;
  type: OrganizationType;
  verification: VerificationStatus;
  description: string;
  areaServed: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website: string;
  metadata: OrganizationMetadata;
};

export const REAL_DIRECTORY_ORGANIZATIONS: RealOrganizationRecord[] = [
  {
    slug: "saytrees-environmental-trust",
    name: "SayTrees Environmental Trust",
    type: "NGO",
    verification: "VERIFIED",
    description:
      "Bengaluru-founded environmental NGO working on lake restoration, water conservation, community volunteering, and urban ecological recovery.",
    areaServed: "Bengaluru, Karnataka, and multi-city India",
    email: "info@saytrees.org",
    phone: "+91-9663577758",
    website: "https://www.saytrees.org/",
    metadata: {
      issueFocus: [
        "lake restoration",
        "water conservation",
        "community volunteering",
        "urban biodiversity",
      ],
      responseModes: [
        "volunteer mobilization",
        "lake rejuvenation partnerships",
        "on-ground cleanup support",
      ],
      sourceLabel: "Official SayTrees contact and program pages",
      sourceUrl: "https://www.saytrees.org/contact",
      volunteerUrl: "https://www.saytrees.org/volunteer",
      officeAddress:
        "No. 6, 1st Floor, ST Main Road, opposite Concorde Midway City Apartment, Basapura, Bengaluru, Karnataka 560100",
      notes:
        "Use when a report needs volunteer turnout, lake restoration partners, or citizen engagement around an urban water body.",
    },
  },
  {
    slug: "united-way-bengaluru-wake-the-lake",
    name: "United Way Bengaluru",
    type: "NGO",
    verification: "VERIFIED",
    description:
      "Through the Wake the Lake campaign, United Way Bengaluru works with communities and government bodies on lake restoration and stewardship.",
    areaServed: "Bengaluru urban and peri-urban lake systems",
    email: "info@uwbengaluru.org",
    phone: "080 4090 6345",
    website: "https://www.uwbengaluru.org/wake-the-lake/",
    metadata: {
      issueFocus: [
        "lake restoration",
        "community lake groups",
        "water conservation",
      ],
      responseModes: [
        "community mobilization",
        "government partnership",
        "lake stewardship programs",
      ],
      sourceLabel: "Official Wake the Lake and United Way Bengaluru pages",
      sourceUrl: "https://www.uwbengaluru.org/wake-the-lake/",
      officeAddress:
        "Building No. 5, 3rd Floor, Crimson Court, Jeevan Bima Nagar Main Road, HAL 3rd Stage, Bengaluru, Karnataka 560075",
      notes:
        "Strong fit for Bengaluru lake campaigns that need both citizen participation and institutional coordination.",
    },
  },
  {
    slug: "hasiru-dala",
    name: "Hasiru Dala",
    type: "NGO",
    verification: "VERIFIED",
    description:
      "Social impact organization focused on waste workers, decentralized solid-waste systems, recycling, and circular-economy field operations.",
    areaServed: "Bengaluru, Karnataka, and South India",
    email: "info@hasirudala.in",
    phone: "080-26593848",
    website: "https://hasirudala.in/",
    metadata: {
      issueFocus: [
        "solid waste management",
        "plastic recovery",
        "decentralized waste systems",
        "waste worker inclusion",
      ],
      responseModes: [
        "waste-system partnerships",
        "dry waste recovery",
        "community awareness",
      ],
      sourceLabel: "Official Hasiru Dala annual report and organization pages",
      sourceUrl:
        "https://hasirudala.in/wp-content/uploads/2023/07/Annual-Report_DWCC_2022-2023.pdf",
      officeAddress:
        "Room No. 13, 2nd Floor, Lakshmi Building, Old No. 11/6, New No. 14, J C Road, Bangalore 560002",
      notes:
        "Best fit for solid-waste, plastic, recycling, and ward-level segregation or material-recovery response.",
    },
  },
  {
    slug: "wwf-india-karnataka-state-office",
    name: "WWF-India Karnataka State Office",
    type: "NGO",
    verification: "VERIFIED",
    description:
      "State office of WWF-India with relevance to freshwater, wetlands, biodiversity conservation, and public-environment partnerships in Karnataka.",
    areaServed: "Karnataka",
    email: "rsunderajan@wwfindia.net",
    phone: "080-23461685 / 080-23463206",
    website: "https://www.wwfindia.org/",
    metadata: {
      issueFocus: [
        "freshwater conservation",
        "wetlands",
        "river basins",
        "biodiversity",
      ],
      responseModes: [
        "conservation partnerships",
        "research collaboration",
        "public awareness",
      ],
      sourceLabel: "Official WWF-India state office directory",
      sourceUrl:
        "https://www.wwfindia.org/who_we_are/where_we_work/state_divisional_offices/",
      officeAddress:
        "116, 3rd Floor, 11th Cross, Margosa Road, Malleshwaram, Bangalore 560003",
      notes:
        "Useful when a report involves wetland ecology, habitat protection, or broader conservation engagement rather than only waste pickup.",
    },
  },
  {
    slug: "bbmp-lakes-monitoring-system",
    name: "BBMP Lakes Monitoring System",
    type: "GOVERNMENT",
    verification: "VERIFIED",
    description:
      "Official Bengaluru municipal lake portal covering lake inventory, inspection status, infrastructure, and city-level lake management contacts.",
    areaServed: "BBMP jurisdiction, Bengaluru",
    email: "specialswmbbmp@gmail.com",
    phone: "080 - 22975518",
    website: "https://lms.bbmpgov.in/",
    metadata: {
      issueFocus: [
        "lake maintenance",
        "sewage inflow",
        "encroachment",
        "lake inspections",
      ],
      responseModes: [
        "municipal escalation",
        "lake department routing",
        "inspection tracking",
      ],
      sourceLabel: "Official BBMP lakes monitoring system",
      sourceUrl: "https://lms.bbmpgov.in/",
      complaintUrl: "https://lms.bbmpgov.in/",
      officeAddress:
        "Bruhat Bengaluru Mahanagara Palike, Head Office, N.R. Square, Hudson Circle, Bengaluru 560002",
      notes:
        "Best for Bengaluru lake issues where users need municipal ownership, inspection context, or the relevant lake department channel.",
    },
  },
  {
    slug: "karnataka-state-pollution-control-board",
    name: "Karnataka State Pollution Control Board",
    type: "GOVERNMENT",
    verification: "VERIFIED",
    description:
      "State pollution regulator for Karnataka handling water and environmental compliance, pollution control oversight, and official complaint escalation.",
    areaServed: "Karnataka",
    email: "HO@kspcb.gov.in",
    phone: "080-25589112 / 080-25589113",
    website: "https://kspcb.sumukha.app/",
    metadata: {
      issueFocus: [
        "water pollution",
        "industrial discharge",
        "environmental compliance",
        "pollution complaints",
      ],
      responseModes: [
        "regulatory escalation",
        "inspection routing",
        "state-level action",
      ],
      sourceLabel: "Official KSPCB about/contact page",
      sourceUrl: "https://kspcb.sumukha.app/Home/About",
      complaintUrl: "https://kspcb.sumukha.app/Home/About",
      officeAddress:
        "\"Parisara Bhavana\", No. 49, Church Street, Bengaluru 560001",
      notes:
        "Best for sewage, industrial discharge, repeated contamination, or cases that need regulator visibility inside Karnataka.",
    },
  },
  {
    slug: "central-pollution-control-board",
    name: "Central Pollution Control Board",
    type: "GOVERNMENT",
    verification: "VERIFIED",
    description:
      "National pollution regulator and official directory hub for SPCBs and PCCs, useful when a case needs cross-state or higher-level regulatory routing.",
    areaServed: "National",
    email: "ccb.cpcb@nic.in",
    phone: "+91-11-43102030",
    website: "https://www.cpcb.nic.in/",
    metadata: {
      issueFocus: [
        "national pollution escalation",
        "SPCB routing",
        "regulatory reference",
      ],
      responseModes: [
        "national escalation",
        "state board directory access",
        "regulator reference",
      ],
      sourceLabel: "Official CPCB contact and SPCB directory pages",
      sourceUrl: "https://cpcb.nic.in/contact-us/",
      complaintUrl: "https://cpcb.nic.in/spcbs-pccs/",
      officeAddress: "Parivesh Bhawan, East Arjun Nagar, Delhi 110032",
      notes:
        "Use when EchoShare needs an official national escalation anchor or a route into the correct state pollution board.",
    },
  },
  {
    slug: "national-mission-for-clean-ganga",
    name: "National Mission for Clean Ganga",
    type: "GOVERNMENT",
    verification: "VERIFIED",
    description:
      "National mission under the Ministry of Jal Shakti for Ganga rejuvenation, basin restoration, river pollution response, and coordinated program action.",
    areaServed: "Ganga basin states",
    email: "admn.nmcg@nic.in",
    phone: "+91-11-23072900",
    website: "https://nmcg.nic.in/",
    metadata: {
      issueFocus: [
        "river pollution",
        "sewage",
        "ganga rejuvenation",
        "riverfront governance",
      ],
      responseModes: [
        "program escalation",
        "river mission coordination",
        "government interface",
      ],
      sourceLabel: "Official NMCG website",
      sourceUrl: "https://nmcg.nic.in/",
      officeAddress:
        "1st Floor, Major Dhyan Chand National Stadium, India Gate, New Delhi 110002",
      notes:
        "Strong fit for Ganga-basin or Namami Gange related reports where river-focused government routing is needed.",
    },
  },
];
