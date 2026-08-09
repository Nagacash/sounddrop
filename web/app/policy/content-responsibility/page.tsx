export default function ContentResponsibilityPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <p className="font-telemetry mb-2 text-[10px] text-sd-muted">DOC / POLICY · CONTENT</p>
      <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] text-sd-text">
        CONTENT
        <br />
        RESPONSIBILITY
      </h1>
      <hr className="sd-rule my-6 max-w-[6rem]" />
      <p className="text-pretty leading-relaxed text-sd-muted">
        Artists are solely responsible for content ownership. SoundDrop is not liable for copyright
        infringement or DMCA claims, licensing disputes or royalty obligations, or third-party
        intellectual property violations.
      </p>

      <h2 className="font-telemetry mt-10 text-[11px] text-sd-muted">[ BEFORE YOU UPLOAD ]</h2>
      <p className="text-pretty mt-3 leading-relaxed text-sd-muted">
        You must certify that you own or have rights to all content you upload. You are solely
        responsible for copyright, licensing, and any disputes. SoundDrop is not liable.
      </p>
      <blockquote className="sd-panel mt-4 border border-sd-border p-4 text-sm text-sd-text">
        I certify that I own or have rights to all content I upload. I am solely responsible for
        copyright, licensing, and any disputes. SoundDrop is not liable.
      </blockquote>

      <h2 className="font-telemetry mt-10 text-[11px] text-sd-muted">[ PLATFORM MEASURES ]</h2>
      <ul className="mt-3 space-y-2 border border-sd-border bg-sd-border">
        {[
          'Ed25519 client-side signing and server-side ingest verification',
          'AudD fingerprint checks at upload where configured',
          'DMCA takedown process (Phase 2 endpoint)',
          'Content removed within 24 hours of valid DMCA notice where applicable',
        ].map((item) => (
          <li key={item} className="bg-sd-surface px-4 py-3 text-sm text-sd-muted">
            <span className="text-sd-accent">///</span> {item}
          </li>
        ))}
      </ul>

      <h2 className="font-telemetry mt-10 text-[11px] text-sd-muted">[ DMCA SAFE HARBOR ]</h2>
      <p className="text-pretty mt-3 leading-relaxed text-sd-muted">
        SoundDrop qualifies under 17 U.S.C. § 512 when designated agents, repeat-infringer policy,
        and takedown procedures are in place. This policy page is part of that good-faith effort.
      </p>
    </main>
  );
}
