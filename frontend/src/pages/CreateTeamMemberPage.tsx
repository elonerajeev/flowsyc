import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTeams } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import type { TeamRecord } from "@/types/crm";

type FormState = {
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  teamId: string;
  designation: string;
  department: string;
  manager: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: string;
  allowances: string;
  deductions: string;
  paymentMode: "" | "bank-transfer" | "cash" | "upi";
  attendance: "" | "present" | "late" | "remote" | "absent";
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
  manager: "",
  workingHours: "",
  officeLocation: "",
  timeZone: "",
  baseSalary: "",
  allowances: "",
  deductions: "",
  paymentMode: "",
  attendance: "",
  checkIn: "",
  location: "",
};

export default function CreateTeamMemberPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: teams = [], isLoading: loadingTeams } = useTeams();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.teamId) {
      toast({
        title: "Error",
        description: "Select a team before creating a member.",
        variant: "destructive",
      });
      return;
    }
    const requiredFields: Array<[keyof FormState, string]> = [
      ["name", "Name"],
      ["email", "Email"],
      ["designation", "Designation"],
      ["department", "Department"],
      ["manager", "Manager"],
      ["workingHours", "Working hours"],
      ["officeLocation", "Office location"],
      ["timeZone", "Time zone"],
      ["baseSalary", "Base salary"],
      ["allowances", "Allowances"],
      ["deductions", "Deductions"],
      ["paymentMode", "Payment mode"],
      ["attendance", "Attendance"],
      ["checkIn", "Check-in"],
      ["location", "Location"],
    ];
    const missing = requiredFields
      .filter(([key]) => !String(formData[key]).trim())
      .map(([, label]) => label);
    if (missing.length) {
      toast({
        title: "Missing fields",
        description: `Fill required fields: ${missing.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const team = teams.find((entry) => entry.id === Number(formData.teamId));
      if (!team) {
        throw new Error("Selected team not found");
      }

      await crmService.createTeamMember({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        team: team.name,
        designation: formData.designation.trim(),
        department: formData.department.trim(),
        manager: formData.manager.trim(),
        workingHours: formData.workingHours.trim(),
        officeLocation: formData.officeLocation.trim(),
        timeZone: formData.timeZone.trim(),
        baseSalary: Number(formData.baseSalary),
        allowances: Number(formData.allowances),
        deductions: Number(formData.deductions),
        paymentMode: formData.paymentMode,
        attendance: formData.attendance,
        checkIn: formData.checkIn.trim(),
        location: formData.location.trim(),
      });

      toast({
        title: "Success",
        description: "Team member created successfully",
      });
      navigate("/people/members");
    } catch {
      toast({
        title: "Error",
        description: "Failed to create team member",
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
          <CardDescription>Add a new team member and assign them to an existing team.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-name">Name</Label>
                <Input
                  id="member-name"
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.role} onValueChange={(value: FormState["role"]) => handleChange("role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={formData.teamId} onValueChange={(value) => handleChange("teamId", value)} disabled={loadingTeams || teams.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingTeams ? "Loading teams..." : "Select a team"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-designation">Designation</Label>
                <Input
                  id="member-designation"
                  value={formData.designation}
                  onChange={(event) => handleChange("designation", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-department">Department</Label>
                <Input
                  id="member-department"
                  value={formData.department}
                  onChange={(event) => handleChange("department", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-manager">Manager</Label>
                <Input
                  id="member-manager"
                  value={formData.manager}
                  onChange={(event) => handleChange("manager", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-working-hours">Working Hours</Label>
                <Input
                  id="member-working-hours"
                  value={formData.workingHours}
                  onChange={(event) => handleChange("workingHours", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-office-location">Office Location</Label>
                <Input
                  id="member-office-location"
                  value={formData.officeLocation}
                  onChange={(event) => handleChange("officeLocation", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-timezone">Time Zone</Label>
                <Input
                  id="member-timezone"
                  value={formData.timeZone}
                  onChange={(event) => handleChange("timeZone", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="member-base-salary">Base Salary</Label>
                <Input
                  id="member-base-salary"
                  type="number"
                  min="0"
                  value={formData.baseSalary}
                  onChange={(event) => handleChange("baseSalary", event.target.value)}
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
                  onChange={(event) => handleChange("allowances", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-deductions">Deductions</Label>
                <Input
                  id="member-deductions"
                  type="number"
                  min="0"
                  value={formData.deductions}
                  onChange={(event) => handleChange("deductions", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={formData.paymentMode} onValueChange={(value) => handleChange("paymentMode", value as FormState["paymentMode"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank-transfer">Bank transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Attendance</Label>
                <Select value={formData.attendance} onValueChange={(value) => handleChange("attendance", value as FormState["attendance"])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select attendance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-check-in">Check-in</Label>
                <Input
                  id="member-check-in"
                  value={formData.checkIn}
                  onChange={(event) => handleChange("checkIn", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-location">Location</Label>
                <Input
                  id="member-location"
                  value={formData.location}
                  onChange={(event) => handleChange("location", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting || loadingTeams || teams.length === 0}>
                {submitting ? "Creating..." : "Create Team Member"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/people/teams")}>
                Back to Teams
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
