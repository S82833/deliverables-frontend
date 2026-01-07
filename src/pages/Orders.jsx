import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";

const COMPLETED_KEY = "tt_completed_orders";

function first(val) {
    if (Array.isArray(val)) return val[0] || "";
    return val || "";
}

function isToday(dateStr) {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    const now = new Date();
    return y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate();
}

function copyToClipboard(text) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
}

function extractCaption(text) {
    if (!text) return "";
    const split = text.split(/(?:\[?\s*slide\s*1\s*\]?|(?:^|\n)\s*1\s*(?=\n))/i);
    const before = split[0];
    const match = before.match(/caption\s*[:\-—]?\s*([\s\S]*)/i);
    return match ? match[1].trim() : "";
}

function parseSlides(text) {
    if (!text) return [];
    let normalized = text;
    normalized = normalized.replace(/(?:\[?\s*slide\s*(\d+)\s*\]?)/gi, (_, n) => `[[SLIDE_${n}]]`);
    normalized = normalized.replace(/(?:^|\n)\s*(\d+)\s*(?=\n)/g, (_, n) => `\n[[SLIDE_${n}]]\n`);
    const parts = normalized.split(/\[\[SLIDE_\d+\]\]/);
    return parts.slice(1).map((p, i) => ({ title: `Slide ${i + 1}`, text: p.trim() }));
}

function getCaptionAndSlides(fields) {
    const textRaw = first(fields["Text to use on post"]);
    const hasShortHook = Array.isArray(fields["Short Hooks Images"]) && fields["Short Hooks Images"].length > 0;

    if (hasShortHook) return { caption: textRaw, slides: [] };

    return { caption: extractCaption(textRaw), slides: parseSlides(textRaw) };
}

export default function Orders() {
    const [params] = useSearchParams();
    const phone = params.get("phone");

    const [grouped, setGrouped] = useState({});
    const [selected, setSelected] = useState(null);
    const [completedMap, setCompletedMap] = useState(() => JSON.parse(localStorage.getItem(COMPLETED_KEY) || "{}"));

    const slidesContainerRef = useRef(null);
    const slideRefs = useRef([]);

    useEffect(() => {
        fetch(`https://deliverables-backend.onrender.com/deliverables?phone=${phone || ""}`)
            .then(r => r.json())
            .then(data => {
                const g = {};
                (data.records || []).forEach(r => {
                    const f = r.fields || {};
                    const day = f["Dia de Entregable"] || "Sin fecha";
                    const crew = first(f["Crewstr"]) || "Sin crew";
                    g[day] ??= {};
                    g[day][crew] ??= [];
                    g[day][crew].push(r);
                });
                setGrouped(g);
            });
    }, [phone]);

    function toggleCompleted(id) {
        const next = { ...completedMap };
        if (next[id]) delete next[id];
        else next[id] = true;
        setCompletedMap(next);
        localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
    }

    function scrollToSlide(index) {
        const el = slideRefs.current[index];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const today = selected && isToday(selected["Dia de Entregable"]);
    const { caption, slides } = useMemo(() => (selected ? getCaptionAndSlides(selected) : { caption: "", slides: [] }), [selected]);

    return (
        <main className="app">
            <header className="app-header"><h1>Entregables TikTok</h1></header>

            <section className="card">
                <h2>Entregables</h2>
                {Object.entries(grouped).map(([day, crews]) => (
                    <div key={day} className="group-day">
                        <h3>📅 {day}</h3>
                        {Object.entries(crews).map(([crew, records]) => (
                            <div key={crew} className="group-crew">
                                <h4>👤 {crew} ({records.length})</h4>
                                {records.map(r => (
                                    <button
                                        key={r.id}
                                        className={`list-item ${completedMap[r.id] ? "completed" : ""}`}
                                        onClick={() => setSelected({ ...r.fields, _id: r.id })}
                                    >
                                        {r.fields?.["EntregableID"]}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </section>

            {selected && (
                <section className="card">
                    <h2>Detalle</h2>

                    <div><strong>Código:</strong> {selected["EntregableID"]}</div>
                    <div><strong>Cuenta:</strong> {first(selected["Name (from 1 Cuenta)"])}</div>
                    <div><strong>Crew:</strong> {first(selected["Crewstr"])}</div>
                    <div><strong>Celular:</strong> {selected["Celular"]}</div>

                    {today && (
                        <>
                            <h3>Audio</h3>
                            <a href={first(selected["Sound Link"])} target="_blank">🎵 Abrir audio</a>
                            <button className="copy-btn" onClick={() => copyToClipboard(first(selected["Sound Link"]))}>📋 Copiar link</button>

                            <div className="image-preview-card">
                                <strong>Imagen</strong>
                                <br></br>
                                <img src={selected["Link Cover Image"]} style={{ maxWidth: 200 }} />
                                <br></br>
                                <button className="copy-btn" onClick={() => window.open(selected["Link Cover Image"], "_blank")}>⬇️ Descargar imagen</button>
                            </div>

                            {Array.isArray(selected["Short Hooks Images"]) && selected["Short Hooks Images"][0]?.url && (
                                <div className="slide-item">
                                    <strong>Slide 0 — Imagen</strong>
                                    <br></br>
                                    <a href={selected["Short Hooks Images"][0].url} target="_blank">Link a la imagen</a>
                                    <br></br>
                                    <img src={selected["Short Hooks Images"][0].url} style={{ maxWidth: 200 }} />
                                </div>
                            )}

                            <h3>Caption</h3>
                            <div className="caption-block">
                                <button className="copy-btn" onClick={() => copyToClipboard(caption)}>📋 Copiar</button>
                                <pre>{caption}</pre>
                            </div>

                            {slides.length > 0 && (
                                <>
                                    <h3>Slides</h3>
                                    <div className="slides-box" ref={slidesContainerRef}>
                                        {slides.map((s, i) => (
                                            <div key={i} className="slide-item" ref={el => slideRefs.current[i] = el}>
                                                <div className="slide-header">
                                                    <strong>{s.title}</strong>
                                                    <button className="copy-btn" onClick={() => { copyToClipboard(s.text); scrollToSlide(i + 1); }}>
                                                        📋 Copiar
                                                    </button>
                                                </div>
                                                <pre>{s.text}</pre>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <h3>Título + Hashtags</h3>
                            <pre>{first(selected["Book - Author - Tropes"])}</pre>
                            <pre>{selected["Hashtags for post"]}</pre>
                            <button className="copy-btn" onClick={() => copyToClipboard(`${first(selected["Book - Author - Tropes"])}\n${selected["Hashtags for post"]}`)}>📋 Copiar</button>
                        </>
                    )}

                    {!today && selected["LINK PARA REPORTAR EL POST"] && (
                        <a href={selected["LINK PARA REPORTAR EL POST"]} target="_blank">📤 Reportar post</a>
                    )}

                    <div className="controls">
                        <button className="done-btn" onClick={() => toggleCompleted(selected._id)}>
                            {completedMap[selected._id] ? "✓ Completado" : "✓ Marcar completado"}
                        </button>
                    </div>
                </section>
            )}
        </main>
    );
}
