import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

const initialStudents = {
  name: "",
  email: "",
  phone: "",
  branch: "",
  cgpa: "",
  graduation_year: "",
};
const initialCompany = { company_name: "", location: "", min_cgpa: "" };
const initialJob = { company_id: "", role: "", salary_package: "", last_date: "" };
const initialApplication = { student_id: "", job_id: "", status: "Applied" };
const initialAdmin = { username: "", password: "" };

function App() {
  const [health, setHealth] = useState(null);
  const [source, setSource] = useState("unknown");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [admins, setAdmins] = useState([]);

  const [studentForm, setStudentForm] = useState(initialStudents);
  const [companyForm, setCompanyForm] = useState(initialCompany);
  const [jobForm, setJobForm] = useState(initialJob);
  const [applicationForm, setApplicationForm] = useState(initialApplication);
  const [adminForm, setAdminForm] = useState(initialAdmin);

  const companyNameMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.company_id, c.company_name])),
    [companies]
  );
  const studentNameMap = useMemo(
    () => Object.fromEntries(students.map((s) => [s.student_id, s.name])),
    [students]
  );

  const api = async (path, options = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(data?.message || `Request failed: ${path}`);
    }
    return data;
  };

  const loadAll = async () => {
    setBusy(true);
    setError("");
    try {
      const [h, s, c, j, a, ad] = await Promise.all([
        api("/health"),
        api("/api/students"),
        api("/api/companies"),
        api("/api/jobs"),
        api("/api/applications"),
        api("/api/admins"),
      ]);
      setHealth(h);
      setStudents(s.data || []);
      setCompanies(c.data || []);
      setJobs(j.data || []);
      setApplications(a.data || []);
      setAdmins(ad.data || []);
      setSource(s.source || "unknown");
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const submit = async (path, body, resetter) => {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      resetter();
      await loadAll();
    } catch (err) {
      setError(err.message || "Submit failed");
      setBusy(false);
    }
  };

  const remove = async (path) => {
    setBusy(true);
    setError("");
    try {
      await api(path, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setError(err.message || "Delete failed");
      setBusy(false);
    }
  };

  const updateApplicationStatus = async (id, status) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/applications/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadAll();
    } catch (err) {
      setError(err.message || "Status update failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-7xl animate-rise space-y-6">
        <header className="rounded-3xl border border-cyan-100/15 bg-gradient-to-r from-slate-900/90 via-teal-950/90 to-emerald-900/60 p-8 shadow-premium">
          <p className="font-body text-xs uppercase tracking-[0.35em] text-cyan-100/80">
            Placement Management
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">  
            <h1 className="font-heading text-3xl sm:text-5xl">Placement Dashboard</h1>
            <button
              onClick={loadAll}
              disabled={busy}
              className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
            >
              {busy ? "Syncing..." : "Refresh"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-slate-300">
           
           
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
              {health?.ok ? "Server Running" : "Server Unknown"}
            </span>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
            <h2 className="font-heading text-2xl">Students</h2>
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(
                  "/api/students",
                  {
                    ...studentForm,
                    cgpa: studentForm.cgpa ? Number(studentForm.cgpa) : null,
                    graduation_year: studentForm.graduation_year
                      ? Number(studentForm.graduation_year)
                      : null,
                  },
                  () => setStudentForm(initialStudents)
                );
              }}
            >
              <input className="input" placeholder="Name *" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
              <input className="input" placeholder="Email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} />
              <input className="input" placeholder="Phone" value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} />
              <input className="input" placeholder="Branch" value={studentForm.branch} onChange={(e) => setStudentForm({ ...studentForm, branch: e.target.value })} />
              <input className="input" placeholder="CGPA" type="number" step="0.01" value={studentForm.cgpa} onChange={(e) => setStudentForm({ ...studentForm, cgpa: e.target.value })} />
              <input className="input" placeholder="Graduation Year" type="number" value={studentForm.graduation_year} onChange={(e) => setStudentForm({ ...studentForm, graduation_year: e.target.value })} />
              <button className="btn-primary col-span-2" type="submit">Add Student</button>
            </form>
            <DataTable
              columns={["ID", "Name", "Branch", "CGPA", "Action"]}
              rows={students.map((s) => [
                s.student_id,
                s.name,
                s.branch,
                s.cgpa,
                <button className="btn-danger" onClick={() => remove(`/api/students/${s.student_id}`)}>Delete</button>,
              ])}
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
            <h2 className="font-heading text-2xl">Companies</h2>
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit("/api/companies", companyForm, () => setCompanyForm(initialCompany));
              }}
            >
              <input className="input" placeholder="Company Name *" value={companyForm.company_name} onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })} required />
              <input className="input" placeholder="Location" value={companyForm.location} onChange={(e) => setCompanyForm({ ...companyForm, location: e.target.value })} />
              <input className="input col-span-2" placeholder="Min CGPA" type="number" step="0.01" value={companyForm.min_cgpa} onChange={(e) => setCompanyForm({ ...companyForm, min_cgpa: e.target.value })} />
              <button className="btn-primary col-span-2" type="submit">Add Company</button>
            </form>
            <DataTable
              columns={["ID", "Company", "Location", "Action"]}
              rows={companies.map((c) => [
                c.company_id,
                c.company_name,
                c.location,
                <button className="btn-danger" onClick={() => remove(`/api/companies/${c.company_id}`)}>Delete</button>,
              ])}
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
            <h2 className="font-heading text-2xl">Jobs</h2>
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(
                  "/api/jobs",
                  { ...jobForm, company_id: Number(jobForm.company_id) },
                  () => setJobForm(initialJob)
                );
              }}
            >
              <select className="input" value={jobForm.company_id} onChange={(e) => setJobForm({ ...jobForm, company_id: e.target.value })} required>
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
                ))}
              </select>
              <input className="input" placeholder="Role" value={jobForm.role} onChange={(e) => setJobForm({ ...jobForm, role: e.target.value })} />
              <input className="input" placeholder="Salary Package" type="number" step="0.01" value={jobForm.salary_package} onChange={(e) => setJobForm({ ...jobForm, salary_package: e.target.value })} />
              <input className="input" type="date" value={jobForm.last_date} onChange={(e) => setJobForm({ ...jobForm, last_date: e.target.value })} />
              <button className="btn-primary col-span-2" type="submit">Add Job</button>
            </form>
            <DataTable
              columns={["ID", "Company", "Role", "LPA", "Action"]}
              rows={jobs.map((j) => [
                j.job_id,
                companyNameMap[j.company_id] || j.company_id,
                j.role,
                j.salary_package,
                <button className="btn-danger" onClick={() => remove(`/api/jobs/${j.job_id}`)}>Delete</button>,
              ])}
            />
          </section>

          <section className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
            <h2 className="font-heading text-2xl">Applications</h2>
            <form
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submit(
                  "/api/applications",
                  {
                    ...applicationForm,
                    student_id: Number(applicationForm.student_id),
                    job_id: Number(applicationForm.job_id),
                  },
                  () => setApplicationForm(initialApplication)
                );
              }}
            >
              <select className="input" value={applicationForm.student_id} onChange={(e) => setApplicationForm({ ...applicationForm, student_id: e.target.value })} required>
                <option value="">Select Student</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.name}</option>
                ))}
              </select>
              <select className="input" value={applicationForm.job_id} onChange={(e) => setApplicationForm({ ...applicationForm, job_id: e.target.value })} required>
                <option value="">Select Job</option>
                {jobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>{j.role || `Job ${j.job_id}`}</option>
                ))}
              </select>
              <select className="input col-span-2" value={applicationForm.status} onChange={(e) => setApplicationForm({ ...applicationForm, status: e.target.value })}>
                <option>Applied</option>
                <option>Under Review</option>
                <option>Selected</option>
                <option>Rejected</option>
              </select>
              <button className="btn-primary col-span-2" type="submit">Add Application</button>
            </form>
            <DataTable
              columns={["ID", "Student", "Job", "Status", "Actions"]}
              rows={applications.map((a) => [
                a.application_id,
                studentNameMap[a.student_id] || a.student_id,
                a.job_id,
                a.status,
                <div className="flex gap-2">
                  <button className="btn-warning" onClick={() => updateApplicationStatus(a.application_id, "Selected")}>Select</button>
                  <button className="btn-danger" onClick={() => remove(`/api/applications/${a.application_id}`)}>Delete</button>
                </div>,
              ])}
            />
          </section>
        </div>

        <section className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
          <h2 className="mb-4 font-heading text-2xl">Admins</h2>
          <form
            className="mb-4 grid grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit("/api/admins", adminForm, () => setAdminForm(initialAdmin));
            }}
          >
            <input className="input" placeholder="Username" value={adminForm.username} onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })} required />
            <input className="input" placeholder="Password" value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} required />
            <button className="btn-primary col-span-2" type="submit">Add Admin</button>
          </form>
          <DataTable
            columns={["ID", "Username", "Action"]}
            rows={admins.map((a) => [
              a.admin_id,
              a.username,
              <button className="btn-danger" onClick={() => remove(`/api/admins/${a.admin_id}`)}>Delete</button>,
            ])}
          />
        </section>
      </div>
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/10">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-semibold text-cyan-100">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-slate-400" colSpan={columns.length}>
                No records
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-white/10 bg-black/10">
                {row.map((cell, i) => (
                  <td key={i} className="px-3 py-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
