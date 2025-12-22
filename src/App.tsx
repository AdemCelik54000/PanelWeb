function App() {
  return (
    <div className="bg-black" style={{ height: "100svh" }}>
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
          height: "100%",
          display: "block",
          background: "#000000",
        }}
      />
    </div>
  );
}

export default App;
