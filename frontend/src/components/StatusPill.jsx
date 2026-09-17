const STYLES = {
  draft: { bg: "var(--color-line)", fg: "#4a4736", label: "Draft" },
  submitted: { bg: "var(--color-amber-light)", fg: "var(--color-amber)", label: "Submitted" },
  approved: { bg: "var(--color-green-light)", fg: "var(--color-green)", label: "Approved" },
  rejected: { bg: "var(--color-red-light)", fg: "var(--color-red)", label: "Rejected" },
  pending: { bg: "var(--color-amber-light)", fg: "var(--color-amber)", label: "Pending" },
  verified: { bg: "var(--color-green-light)", fg: "var(--color-green)", label: "Verified" },
  paid: { bg: "var(--color-green-light)", fg: "var(--color-green)", label: "Paid" },
  unpaid: { bg: "var(--color-red-light)", fg: "var(--color-red)", label: "Unpaid" },
  not_started: { bg: "var(--color-line)", fg: "#4a4736", label: "Not Started" },
  in_progress: { bg: "var(--color-amber-light)", fg: "var(--color-amber)", label: "In Progress" },
};

export default function StatusPill({ status }) {
  const style = STYLES[status] || { bg: "var(--color-line)", fg: "#4a4736", label: status };
  return (
    <span className="status-pill" style={{ background: style.bg, color: style.fg }}>
      {style.label}
    </span>
  );
}
