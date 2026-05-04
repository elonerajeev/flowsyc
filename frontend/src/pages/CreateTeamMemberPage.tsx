import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { crmService } from "@/services/crm";

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Marketing",
  "Sales",
  "Customer Success",
  "Operations",
  "Finance",
  "HR",
  "Legal",
  "IT",
  "Admin",
] as const;

const DESIGNATIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Engineer",
  "Principal Engineer",
  "Engineering Manager",
  "Product Manager",
  "Senior Product Manager",
  "Designer",
  "Senior Designer",
  "Design Lead",
  "Marketing Manager",
  "Sales Representative",
  "Account Executive",
  "Customer Success Manager",
  "Operations Manager",
  "Finance Manager",
  "HR Manager",
  "Admin Executive",
  "Intern",
] as const;

const WORK_HOURS = [
  { value: "09:00 AM - 06:00 PM", label: "09:00 AM - 06:00 PM" },
  { value: "10:00 AM - 07:00 PM", label: "10:00 AM - 07:00 PM" },
  { value: "08:00 AM - 05:00 PM", label: "08:00 AM - 05:00 PM" },
  { value: "09:30 AM - 06:30 PM", label: "09:30 AM - 06:30 PM" },
  { value: "Flexible", label: "Flexible Hours" },
] as const;

const OFFICE_LOCATIONS = [
  "Headquarters",
  "Remote",
  "Bangalore Office",
  "Mumbai Office",
  "Delhi Office",
  "Hyderabad Office",
  "Chennai Office",
  "Pune Office",
] as const;

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "IST (UTC+5:30)" },
  { value: "Asia/Singapore", label: "SGT (UTC+8)" },
  { value: "America/New_York", label: "EST (UTC-5)" },
  { value: "America/Los_Angeles", label: "PST (UTC-8)" },
  { value: "Europe/London", label: "GMT (UTC+0)" },
  { value: "Europe/Berlin", label: "CET (UTC+1)" },
] as const;

const DEFAULT_ALLOWANCES = 5000;
const DEFAULT_DEDUCTIONS = 0;

type FormState = {
  name: string;
  email: string;
  role: "Manager" | "Employee";
  teamId: string;
  designation: string;
  department: string;
  managerId: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: string;
  allowances: string;
  deductions: string;
  paymentMode: "" | "bank_transfer" | "cash" | "upi";
  attendance: "" | "present";
  checkIn: string;
  location: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  role: "Employee",
  teamId: "",
  designation: "",
  department: "",
  managerId: "",
  workingHours: "09:00 AM - 06:00 PM",
  officeLocation: "",
  timeZone: "Asia/Kolkata",
  baseSalary: "",
  allowances: String(DEFAULT_ALLOWANCES),
  deductions: String(DEFAULT_DEDUCTIONS),
  paymentMode: "",
  attendance: "present",
  checkIn: "-",
  location: "",
};

export default function CreateTeamMemberPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const availableManagers = useMemo(() => {
    return [];
  }, []);

  const availableDepartments = useMemo(() => {
    return [...DEPARTMENTS];
  }, []);

  const availableDesignations = useMemo(() => {
    return [...DESIGNATIONS];
  }, []);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));

    if (field === "role" && value === "Manager") {
      setFormData((current) => ({
        ...current,
        role: value,
        managerId: "",
      }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.teamId) {
      toast({
        title: "Error",
        description: "Please select a team first.",
        variant: "destructive",
      });
      return;
    }

    const requiredFields: Array<[keyof FormState, string]> = [
      ["name", "Name"],
      ["email", "Email"],
      ["designation", "Designation"],
      ["department", "Department"],
      ["workingHours", "Working hours"],
      ["officeLocation", "Office location"],
      ["timeZone", "Time zone"],
      ["baseSalary", "Base salary"],
      ["paymentMode", "Payment mode"],
    ];

    const missing = requiredFields.filter(([key]) => !String(formData[key]).trim());
    if (missing.length) {
      toast({
        title: "Missing fields",
        description: `Please fill: ${missing.map(([, label]) => label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    if (formData.role === "Employee" && !formData.managerId) {
      toast({
        title: "Missing manager",
        description: "Please select a manager for this employee.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const managerName = formData.managerId
        ? availableManagers.find((m) => m.id === formData.managerId)?.name || "Unassigned"
        : "Direct Report";

      await crmService.createTeamMember({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        team: formData.teamId,
        designation: formData.designation,
        department: formData.department,
        manager: managerName,
        workingHours: formData.workingHours,
        officeLocation: formData.officeLocation,
        timeZone: formData.timeZone,
        baseSalary: Number(formData.baseSalary) || 0,
        allowances: Number(formData.allowances) || 0,
        deductions: Number(formData.deductions) || 0,
        paymentMode: formData.paymentMode as "bank_transfer" | "cash" | "upi",
        attendance: formData.attendance || "present",
        checkIn: formData.checkIn || "-",
        location: formData.location || "-",
      });

      toast({
        title: "Success",
        description: `Team member "${formData.name}" created successfully`,
      });
      navigate("/people/teams");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create team member",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Team Member</CardTitle>
          <CardDescription>Add a new team member to your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-name">Full Name *</Label>
                <Input
                  id="member-name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-email">Email Address *</Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={formData.role} onValueChange={(value: FormState["role"]) => handleChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team *</Label>
                <Select value={formData.teamId} onValueChange={(value) => handleChange("teamId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Engineering">Engineering</SelectItem>
                    <SelectItem value="Product">Product</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Select value={formData.designation} onValueChange={(value) => handleChange("designation", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDesignations.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department *</Label>
                <Select value={formData.department} onValueChange={(value) => handleChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDepartments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.role === "Employee" ? (
              <div className="space-y-2">
                <Label>Reports To *</Label>
                <Select value={formData.managerId} onValueChange={(value) => handleChange("managerId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self-managed">Direct Report (No Manager)</SelectItem>
                    <SelectItem value="John Smith">John Smith - Engineering Manager</SelectItem>
                    <SelectItem value="Sarah Johnson">Sarah Johnson - Product Manager</SelectItem>
                    <SelectItem value="Mike Davis">Mike Davis - Sales Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="rounded-md bg-primary/10 p-4 text-sm text-primary">
                As a Manager, you&apos;ll be leading a team. You can assign team members once created.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Working Hours *</Label>
                <Select
                  value={formData.workingHours}
                  onValueChange={(value) => handleChange("workingHours", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_HOURS.map((h) => (
                      <SelectItem key={h.value} value={h.value}>
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Office Location *</Label>
                <Select
                  value={formData.officeLocation}
                  onValueChange={(value) => handleChange("officeLocation", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICE_LOCATIONS.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Time Zone *</Label>
                <Select value={formData.timeZone} onValueChange={(value) => handleChange("timeZone", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  id="member-location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="member-base-salary">Base Salary *</Label>
                <Input
                  id="member-base-salary"
                  type="number"
                  min="0"
                  placeholder="50000"
                  value={formData.baseSalary}
                  onChange={(e) => handleChange("baseSalary", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-allowances">Allowances</Label>
                <Input
                  id="member-allowances"
                  type="number"
                  min="0"
                  value={formData.allowances}
                  onChange={(e) => handleChange("allowances", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-deductions">Deductions</Label>
                <Input
                  id="member-deductions"
                  type="number"
                  min="0"
                  value={formData.deductions}
                  onChange={(e) => handleChange("deductions", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select
                  value={formData.paymentMode}
                  onValueChange={(value: FormState["paymentMode"]) => handleChange("paymentMode", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Attendance Status</Label>
                <Select
                  value={formData.attendance}
                  onValueChange={(value: FormState["attendance"]) => handleChange("attendance", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Team Member"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/people/teams")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}