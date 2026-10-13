import { FeatureIcon } from "@/components/home/feature-icon";
import { Reveal } from "@/components/home/reveal";
import { FEATURES } from "@/lib/home";

export function WhySection() {
  return (
    <Reveal className="home-section">
      <div className="section-head">
        <div className="kicker pixel neon-magenta">{"// 01"}</div>
        <h2 className="section-title">¿POR QUÉ ARCADE VAULT?</h2>
        <div className="section-rule"></div>
      </div>
      <div className="feature-grid">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={"feature-card " + f.color}
            style={{ transitionDelay: i * 80 + "ms" }}
          >
            <FeatureIcon kind={f.icon} />
            <div className="ft-title pixel">{f.title}</div>
            <div className="ft-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
