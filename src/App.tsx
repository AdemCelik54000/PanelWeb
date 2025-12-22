function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <p
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        Start prompting (or editing) to see magic happen :)
      </p>
      <iframe
        title="Upload chantier"
        src="/upload.html"
        style={{
          border: "none",
          width: "100%",
          height: "100vh",
          display: "block",
          background: "#0f172a",
        }}
      />
    </div>
  );
}

export default App;
