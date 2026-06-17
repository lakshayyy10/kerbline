export default function Loader({ label = "loading" }: { label?: string }) {
  return (
    <div className="loader">
      <div className="loader-mark">K</div>
      <div className="loader-text">
        {label}
        <span className="loader-dots">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
}
