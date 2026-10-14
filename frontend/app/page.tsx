"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type AnalysisResult = {
  oil_coverage_percent: number;
  component_count: number;
  mean_oil_probability: number;
  threshold: number;
  min_pixels: number;
  mask_data_url: string;
  overlay_data_url: string;
};

type ViewMode = "original" | "mask" | "overlay";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const viewModes: ViewMode[] = ["original", "mask", "overlay"];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setViewMode("original");
    setError("");
  }

  async function analyzeImage() {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Analysis failed. Please try again.",
        );
      }

      setResult(data as AnalysisResult);
      setViewMode("overlay");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not analyze the image. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const displayedImage =
    result && viewMode === "mask"
      ? result.mask_data_url
      : result && viewMode === "overlay"
        ? result.overlay_data_url
        : preview;

  return (
    <main className="app-shell">
      <div className="page-wrap">
        <header className="topbar">
          <Link className="brand" href="/" aria-label="SlickNet home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="M4 12.5c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3 3.2-3 6.4-3 3.2 3 6.4 3M4 20c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3 3.2-3 6.4-3 3.2 3 6.4 3"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span className="brand-name">slicknet</span>
          </Link>
          <span className="topbar-label">MARINE IMAGING STUDIO</span>
          <span className="topbar-indicator">
            <span className="indicator-dot" />
            SAR ANALYSIS
          </span>
        </header>

        <section className="intro">
          <p className="eyebrow">
            <span className="eyebrow-line" />
            REMOTE SENSING · OIL SLICK DETECTION
          </p>
          <h1>
            A clearer view
            <br />
            <span>of our oceans.</span>
          </h1>
          <p className="intro-copy">
            Explore candidate oil slicks in SAR imagery with pixel-level
            segmentation powered by SlickNet.
          </p>
        </section>

        <section className="workspace" aria-label="SAR image analysis">
          <div className="image-card">
            <div className="card-heading">
              <div>
                <p className="section-kicker">01 / IMAGE WORKSPACE</p>
                <h2>Scene preview</h2>
              </div>
              <label className="upload-button">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M10 13V3m0 0L6.5 6.5M10 3l3.5 3.5M4 12.5v3A1.5 1.5 0 005.5 17h9a1.5 1.5 0 001.5-1.5v-3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{file ? "Change image" : "Upload image"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>

            <div className={`image-stage${displayedImage ? " has-image" : ""}`}>
              {displayedImage ? (
                <div className="scene-image-wrap">
                  <Image
                    src={displayedImage}
                    alt={
                      viewMode === "original"
                        ? "Original SAR image"
                        : `SlickNet ${viewMode} segmentation result`
                    }
                    fill
                    unoptimized
                    sizes="(max-width: 900px) 100vw, 65vw"
                    className="scene-image"
                  />
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-art" aria-hidden="true">
                    <div className="art-orbit orbit-one" />
                    <div className="art-orbit orbit-two" />
                    <div className="art-surface">
                      <svg viewBox="0 0 72 72" fill="none">
                        <path
                          d="M12 29c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5M12 39c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5M12 49c6 0 6-5 12-5s6 5 12 5 6-5 12-5 6 5 12 5"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3>Your next scene starts here</h3>
                  <p>Upload a SAR image to preview and analyze slick regions.</p>
                  <span className="file-hint">PNG, JPG, TIFF · IMAGE FILES</span>
                </div>
              )}
              {file && (
                <div className="image-caption">
                  <span className="caption-dot" />
                  <span className="filename" title={file.name}>
                    {file.name}
                  </span>
                  <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
              )}
            </div>

            <div className="image-toolbar">
              <div className="view-switch" aria-label="Image view">
                {viewModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    disabled={!preview || (mode !== "original" && !result)}
                    aria-pressed={viewMode === mode}
                    className={viewMode === mode ? "view-active" : ""}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={analyzeImage}
                disabled={!file || loading}
                className="analyze-button"
              >
                {loading ? (
                  <>
                    <span className="loading-spinner" />
                    Analyzing scene
                  </>
                ) : (
                  <>
                    Run analysis
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M4 10h12m-5-5 5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>

          <aside className="insights-card">
            <div className="insights-heading">
              <div>
                <p className="section-kicker">02 / MODEL OUTPUT</p>
                <h2>Scene insights</h2>
              </div>
              <span className={`result-badge${result ? " badge-ready" : ""}`}>
                <span />
                {result ? "COMPLETE" : "AWAITING IMAGE"}
              </span>
            </div>

            {result ? (
              <div className="metrics">
                <div className="coverage-metric">
                  <p className="metric-label">PREDICTED SLICK COVERAGE</p>
                  <p className="coverage-value">
                    {result.oil_coverage_percent.toFixed(2)}
                    <span>%</span>
                  </p>
                  <p className="metric-note">of the analyzed scene</p>
                </div>
                <div className="metric-pair">
                  <Metric
                    label="Detected regions"
                    value={String(result.component_count)}
                  />
                  <Metric
                    label="Mean confidence"
                    value={`${(result.mean_oil_probability * 100).toFixed(1)}%`}
                  />
                </div>
                <div className="model-details">
                  <p className="section-kicker">MODEL PARAMETERS</p>
                  <div className="detail-row">
                    <span>Probability threshold</span>
                    <span>{result.threshold.toFixed(2)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Minimum region size</span>
                    <span>{result.min_pixels.toLocaleString()} px</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="insights-empty">
                <div className="insights-empty-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 19V5m0 14h16M7 15l4-4 3 2 5-6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="19" cy="7" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <h3>Insights will appear here</h3>
                <p>
                  Upload a scene and run the model to see coverage, detected
                  regions, and confidence.
                </p>
              </div>
            )}

            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}

            <div className="model-note">
              <span className="model-note-mark">i</span>
              <p>
                Model predictions highlight candidate slicks and should be
                reviewed alongside the original imagery.
              </p>
            </div>
          </aside>
        </section>

        <footer className="page-footer">
          <span>SLICKNET <span className="footer-separator">/</span> SAR SEGMENTATION</span>
          <span>RESEARCH PREVIEW</span>
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="small-metric">
      <p className="metric-label">{label}</p>
      <p className="small-metric-value">{value}</p>
    </div>
  );
}
