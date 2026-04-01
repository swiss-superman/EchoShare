export type ReportCreateActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialReportCreateState: ReportCreateActionState = {
  status: "idle",
};
