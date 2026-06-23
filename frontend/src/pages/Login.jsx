export default function Login() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh"
    }}>
      <div style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "10px" }}>
        <h2>Login</h2>
        <input placeholder="Username" />
        <br /><br />
        <input placeholder="Password" type="password" />
        <br /><br />
        <button>Login</button>
      </div>
    </div>
  );
}