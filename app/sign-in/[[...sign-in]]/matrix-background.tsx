export default function MatrixBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#f4f4f4]" />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #ff002b 0px, #ff002b 120px, #f4f4f4 120px, #f4f4f4 240px)",
        }}
      />

      <div className="absolute inset-0 bg-black/10" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0.15))]" />
    </div>
  );
}