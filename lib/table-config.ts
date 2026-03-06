/**
 * UI metadata for the /manage page.
 * Column info is used to render forms and table headers.
 * All SQL lives in app/api/manage/[table]/route.ts as explicit templates.
 */

export interface ColumnDef {
  name: string;
  label: string;
  type: "int" | "decimal" | "varchar" | "date" | "tinyint";
  required: boolean;
  pk: boolean;
  min?: number;
  max?: number;
}

export interface TableDef {
  key: string;
  label: string;
  columns: ColumnDef[];
  scenarios: string[];
}

export const TABLE_CONFIGS: TableDef[] = [
  {
    key: "colleges",
    label: "Colleges",
    scenarios: ["Q1", "Q2", "A1–A5"],
    columns: [
      { name: "college_id", label: "College ID", type: "int", required: true, pk: true },
      { name: "name", label: "Name", type: "varchar", required: true, pk: false },
      { name: "campus", label: "Campus", type: "varchar", required: false, pk: false },
      { name: "type", label: "Type", type: "varchar", required: true, pk: false },
      { name: "fscl", label: "FSCL", type: "varchar", required: false, pk: false },
      { name: "website_url", label: "Website URL", type: "varchar", required: false, pk: false },
    ],
  },
  {
    key: "location",
    label: "Location",
    scenarios: ["Q1"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "street", label: "Street", type: "varchar", required: false, pk: false },
      { name: "city", label: "City", type: "varchar", required: true, pk: false },
      { name: "state", label: "State", type: "varchar", required: true, pk: false },
      { name: "postal_code", label: "Postal Code", type: "varchar", required: true, pk: false },
    ],
  },
  {
    key: "departments",
    label: "Departments",
    scenarios: ["Q5", "Q6", "Q7"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "department_id", label: "Dept ID", type: "int", required: true, pk: true },
      { name: "department_name", label: "Department Name", type: "varchar", required: true, pk: false },
    ],
  },
  {
    key: "programs",
    label: "Programs",
    scenarios: ["Q1", "Q2", "Q6"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "department_id", label: "Dept ID", type: "int", required: true, pk: true },
      { name: "program_id", label: "Program ID", type: "int", required: true, pk: true },
      { name: "name", label: "Program Name", type: "varchar", required: true, pk: false },
      { name: "degree", label: "Degree", type: "varchar", required: false, pk: false },
      { name: "type", label: "Type", type: "varchar", required: false, pk: false },
      { name: "length", label: "Length", type: "varchar", required: false, pk: false },
    ],
  },
  {
    key: "faculty",
    label: "Faculty",
    scenarios: ["Q7"],
    columns: [
      { name: "email", label: "Email", type: "varchar", required: true, pk: true },
      { name: "first_name", label: "First Name", type: "varchar", required: true, pk: false },
      { name: "last_name", label: "Last Name", type: "varchar", required: true, pk: false },
      { name: "teaching_year", label: "Teaching Year", type: "int", required: false, pk: false },
      { name: "phone_number", label: "Phone", type: "varchar", required: false, pk: false },
      { name: "college_id", label: "College", type: "int", required: true, pk: false },
      { name: "department_id", label: "Dept ID", type: "int", required: true, pk: false },
    ],
  },
  {
    key: "parking_permits",
    label: "Parking Permits",
    scenarios: ["Q3"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "permit", label: "Permit", type: "varchar", required: true, pk: true },
      { name: "cost", label: "Cost", type: "decimal", required: true, pk: false, min: 0 },
      { name: "rate", label: "Rate", type: "varchar", required: false, pk: false },
    ],
  },
  {
    key: "housing",
    label: "Housing",
    scenarios: ["Q4"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "building_name", label: "Building Name", type: "varchar", required: true, pk: true },
      { name: "address", label: "Address", type: "varchar", required: true, pk: true },
      { name: "units", label: "Units", type: "int", required: false, pk: false, min: 0 },
      { name: "is_on_campus", label: "On Campus", type: "tinyint", required: true, pk: false, min: 0, max: 1 },
    ],
  },
  {
    key: "admission_statistics",
    label: "Admission Statistics",
    scenarios: ["A1"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "year", label: "Year", type: "int", required: true, pk: true, min: 1 },
      { name: "applications_received", label: "Apps Received", type: "int", required: false, pk: false, min: 0 },
      { name: "applications_admitted", label: "Apps Admitted", type: "int", required: false, pk: false, min: 0 },
    ],
  },
  {
    key: "expenses",
    label: "Expenses",
    scenarios: ["A2"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "year", label: "Year", type: "int", required: true, pk: true, min: 1 },
      { name: "resident_tuition", label: "Resident Tuition", type: "decimal", required: true, pk: false, min: 0 },
      { name: "nonresident_tuition", label: "Nonresident Tuition", type: "decimal", required: true, pk: false, min: 0 },
      { name: "books_supplies", label: "Books & Supplies", type: "decimal", required: false, pk: false, min: 0 },
    ],
  },
  {
    key: "ethnicities",
    label: "Ethnicities",
    scenarios: ["A3"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "year", label: "Year", type: "int", required: true, pk: true, min: 1 },
      { name: "ethnicity", label: "Ethnicity", type: "varchar", required: true, pk: true },
      { name: "percent_enrolled", label: "% Enrolled", type: "decimal", required: true, pk: false, min: 0, max: 100 },
    ],
  },
  {
    key: "gender",
    label: "Gender",
    scenarios: ["A4"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "year", label: "Year", type: "int", required: true, pk: true, min: 1 },
      { name: "gender", label: "Gender", type: "varchar", required: true, pk: true },
      { name: "percent_enrolled", label: "% Enrolled", type: "decimal", required: true, pk: false, min: 0, max: 100 },
    ],
  },
  {
    key: "walkscore_stats",
    label: "Walk Score Stats",
    scenarios: ["A5"],
    columns: [
      { name: "college_id", label: "College", type: "int", required: true, pk: true },
      { name: "walk", label: "Walk Score", type: "int", required: false, pk: false, min: 0, max: 100 },
      { name: "transit", label: "Transit Score", type: "int", required: false, pk: false, min: 0, max: 100 },
      { name: "bike", label: "Bike Score", type: "int", required: false, pk: false, min: 0, max: 100 },
    ],
  },
];
