import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kerbline — Parking Congestion Intelligence",
  description:
    "Detect illegal-parking hotspots and quantify their impact on traffic flow across Bengaluru — built for targeted enforcement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <div className="smallscreen">
          <div className="ss-mark">K</div>
          <div className="ss-title">
            Kerb<b>line</b>
          </div>
          <p>
            This is a control-room dashboard built for a wide screen. Open it on
            a laptop or desktop for the full operations, insights and deployment
            view.
          </p>
        </div>
      </body>
    </html>
  );
}
