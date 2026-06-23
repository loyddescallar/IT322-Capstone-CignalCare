import Layout from "../components/Layout";

export default function AdminDashboard() {
  return (
    <Layout>
      <h1>Admin Dashboard</h1>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <div style={{ padding: "15px", border: "1px solid #ccc" }}>
          Total Users
        </div>

        <div style={{ padding: "15px", border: "1px solid #ccc" }}>
          Active Tickets
        </div>
      </div>
    </Layout>
  );
}