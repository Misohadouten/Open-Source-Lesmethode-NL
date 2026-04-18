import html
import json
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
import streamlit as st
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DATA_PATH = Path(__file__).parent / "lesmethodes.json"

st.set_page_config(
    page_title="Lesmethode Analyse",
    page_icon="📘",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    html, body, [class*="css"]  {
        font-family: 'Inter', sans-serif;
    }

    .stApp {
        background:
            radial-gradient(circle at 10% 0%, rgba(37,99,235,0.07), transparent 20%),
            radial-gradient(circle at 100% 10%, rgba(14,165,233,0.08), transparent 22%),
            linear-gradient(180deg, #f5f8fc 0%, #eef3f9 100%);
        color: #0f172a;
    }

    .block-container {
        max-width: 1320px;
        padding-top: 1.2rem;
        padding-bottom: 2rem;
    }

    section[data-testid="stSidebar"] {display:none;}
    #MainMenu, footer, header {visibility: hidden;}

    .topbar {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom: 1rem;
        gap: 1rem;
    }

    .brand {
        display:flex;
        align-items:center;
        gap:.8rem;
    }

    .brand-icon {
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 60%, #38bdf8 100%);
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:800;
        box-shadow: 0 12px 28px rgba(29,78,216,0.25);
    }

    .brand-title {
        font-size: 1.05rem;
        font-weight: 800;
        color: #0f172a;
        line-height:1.2;
    }

    .brand-sub {
        color:#64748b;
        font-size:.88rem;
        margin-top:.15rem;
    }

    .top-pill {
        border: 1px solid rgba(148,163,184,.35);
        background: rgba(255,255,255,0.75);
        backdrop-filter: blur(12px);
        border-radius: 999px;
        padding: .55rem .9rem;
        color:#334155;
        font-weight:600;
        font-size:.85rem;
        box-shadow: 0 10px 24px rgba(15,23,42,0.04);
    }

    .hero-shell {
        background: linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(29,78,216,0.97) 58%, rgba(14,165,233,0.95) 100%);
        border-radius: 32px;
        padding: 2.15rem;
        color: white;
        box-shadow: 0 24px 60px rgba(15,23,42,0.18);
        position: relative;
        overflow: hidden;
        margin-bottom: 1.2rem;
        border: 1px solid rgba(255,255,255,0.1);
    }

    .hero-shell:before,
    .hero-shell:after {
        content:"";
        position:absolute;
        border-radius:50%;
        background: rgba(255,255,255,0.08);
        filter: blur(2px);
    }
    .hero-shell:before {
        width: 220px; height:220px; right:-40px; top:-60px;
    }
    .hero-shell:after {
        width: 160px; height:160px; right:180px; bottom:-70px;
    }

    .hero-grid {
        display:grid;
        grid-template-columns: 1.5fr .9fr;
        gap: 1.2rem;
        align-items: end;
        position: relative;
        z-index: 1;
    }

    .hero-eyebrow {
        text-transform: uppercase;
        letter-spacing: .12em;
        font-size: .78rem;
        font-weight: 700;
        opacity: .88;
        margin-bottom: .8rem;
    }

    .hero-title {
        font-size: 2.75rem;
        line-height: 1.03;
        font-weight: 800;
        margin: 0;
        max-width: 760px;
        letter-spacing: -0.04em;
    }

    .hero-copy {
        margin-top: 1rem;
        font-size: 1.04rem;
        line-height: 1.65;
        color: rgba(255,255,255,0.93);
        max-width: 760px;
    }

    .chip-row {
        display:flex;
        flex-wrap:wrap;
        gap:.6rem;
        margin-top: 1.1rem;
    }

    .chip {
        background: rgba(255,255,255,.12);
        border: 1px solid rgba(255,255,255,.16);
        color:white;
        font-weight:700;
        font-size:.84rem;
        border-radius: 999px;
        padding:.45rem .78rem;
    }

    .hero-stat-card {
        background: rgba(255,255,255,.1);
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 24px;
        padding: 1.1rem 1.15rem;
        backdrop-filter: blur(12px);
    }

    .hero-stat-label {
        color: rgba(255,255,255,.78);
        font-size:.85rem;
        margin-bottom:.3rem;
    }

    .hero-stat-value {
        font-size: 2rem;
        font-weight: 800;
        line-height:1;
    }

    .hero-stat-sub {
        margin-top:.45rem;
        color: rgba(255,255,255,.9);
        line-height:1.5;
        font-size:.92rem;
    }

    .panel {
        background: rgba(255,255,255,0.84);
        border: 1px solid rgba(203,213,225,0.72);
        box-shadow: 0 18px 40px rgba(15,23,42,0.06);
        backdrop-filter: blur(14px);
        border-radius: 28px;
        padding: 1.25rem;
        height: 100%;
    }

    .panel-tight {
        padding: 1rem;
    }

    .section-title {
        font-size: 1.08rem;
        font-weight: 800;
        color: #0f172a;
        margin-bottom:.25rem;
        letter-spacing:-.02em;
    }

    .section-copy {
        color:#64748b;
        font-size:.94rem;
        line-height:1.6;
        margin-bottom: 1rem;
    }

    .subtle-card {
        background: #ffffff;
        border:1px solid #e2e8f0;
        border-radius: 22px;
        padding: .95rem 1rem;
        box-shadow: 0 8px 20px rgba(15,23,42,.04);
    }

    .legend-row {
        display:grid;
        grid-template-columns: 1fr;
        gap: .7rem;
    }

    .legend-item {
        display:flex;
        align-items:flex-start;
        gap:.75rem;
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:18px;
        padding:.85rem .95rem;
    }

    .legend-dot {
        width: 12px;
        height: 12px;
        border-radius:50%;
        margin-top:.28rem;
        flex-shrink:0;
    }

    .legend-title {
        font-weight:700;
        color:#0f172a;
        margin-bottom:.12rem;
    }

    .legend-copy {
        color:#64748b;
        font-size:.9rem;
        line-height:1.45;
    }

    .mini-grid {
        display:grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: .8rem;
        margin-top: .95rem;
    }

    .mini-card {
        background:white;
        border:1px solid #e2e8f0;
        border-radius:20px;
        padding:.95rem 1rem;
        box-shadow: 0 8px 18px rgba(15,23,42,.04);
    }

    .mini-label {color:#64748b; font-size:.85rem; margin-bottom:.32rem;}
    .mini-value {color:#0f172a; font-weight:800; font-size:1.15rem; line-height:1.2;}
    .mini-sub {color:#64748b; font-size:.85rem; margin-top:.35rem; line-height:1.45;}

    .result-card {
        background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        border: 1px solid #e2e8f0;
        border-radius: 26px;
        padding: 1rem;
        box-shadow: 0 12px 28px rgba(15,23,42,0.05);
        margin-bottom: .9rem;
    }

    .result-header {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap: 1rem;
        margin-bottom: .55rem;
    }

    .result-rank {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width: 30px;
        height: 30px;
        border-radius: 10px;
        background: #eff6ff;
        color:#1d4ed8;
        font-size:.9rem;
        font-weight:800;
        margin-right:.6rem;
        flex-shrink:0;
    }

    .result-name-wrap {display:flex; align-items:flex-start;}
    .result-title {font-size:1.06rem; font-weight:800; color:#0f172a; line-height:1.3;}
    .result-meta {font-size:.88rem; color:#64748b; margin-top:.18rem;}

    .badge {
        display:inline-block;
        padding:.38rem .72rem;
        border-radius:999px;
        font-size:.77rem;
        font-weight:800;
        letter-spacing:.01em;
        white-space:nowrap;
        border: 1px solid transparent;
    }
    .badge-high { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
    .badge-mid { background:#fef3c7; color:#92400e; border-color:#fde68a; }
    .badge-low { background:#e2e8f0; color:#334155; border-color:#cbd5e1; }

    .scoreline {
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:.38rem;
        color:#334155;
        font-size:.92rem;
    }

    .progress-shell {
        width:100%;
        height: 12px;
        background:#e2e8f0;
        border-radius:999px;
        overflow:hidden;
    }
    .progress-bar {
        height:100%;
        border-radius:999px;
        background: linear-gradient(90deg, #38bdf8 0%, #2563eb 55%, #16a34a 100%);
    }

    .result-snippet {
        margin-top:.82rem;
        color:#475569;
        font-size:.92rem;
        line-height:1.55;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:16px;
        padding:.8rem .9rem;
    }

    .system-advice {
        background: linear-gradient(180deg, #0f172a 0%, #172554 100%);
        border-radius: 24px;
        padding: 1rem 1.05rem;
        color: white;
        box-shadow: 0 18px 32px rgba(15,23,42,.16);
        border:1px solid rgba(255,255,255,.08);
        margin-top: .5rem;
    }

    .advice-label {
        font-size:.8rem;
        letter-spacing:.08em;
        text-transform:uppercase;
        color: rgba(255,255,255,.72);
        font-weight:700;
        margin-bottom:.5rem;
    }

    .advice-title {
        font-size:1.05rem;
        font-weight:800;
        margin-bottom:.35rem;
    }

    .advice-copy {
        color: rgba(255,255,255,.9);
        font-size:.94rem;
        line-height:1.6;
    }

    .input-shell {
        background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        border:1px solid #e2e8f0;
        border-radius: 22px;
        padding: .75rem;
    }

    .input-caption {
        font-size:.82rem;
        color:#64748b;
        margin-top:.5rem;
        line-height:1.45;
    }

    .stTextArea textarea {
        border-radius: 18px !important;
        border: 1px solid #dbe3ee !important;
        background: #ffffff !important;
        font-size: .96rem !important;
        line-height: 1.65 !important;
        padding: 1rem !important;
        box-shadow: inset 0 1px 2px rgba(15,23,42,.03);
    }

    .stSelectbox > div > div,
    .stSlider > div > div {
        border-radius: 16px !important;
    }

    .stButton > button {
        min-height: 3rem !important;
        border-radius: 16px !important;
        font-weight: 700 !important;
        border: 1px solid #dbe3ee !important;
        box-shadow: 0 8px 18px rgba(15,23,42,.05) !important;
    }

    .footer-note {
        color:#64748b;
        text-align:center;
        margin-top: 1rem;
        font-size:.86rem;
    }

    @media (max-width: 1100px) {
        .hero-grid { grid-template-columns: 1fr; }
    }
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_data
def load_data() -> List[Dict]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


@st.cache_resource(show_spinner=False)
def fit_vectorizer(corpus_texts: Tuple[str, ...]):
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), lowercase=True)
    matrix = vectorizer.fit_transform(corpus_texts)
    return vectorizer, matrix



def normalize_text(method: Dict) -> str:
    parts = [
        method.get("titel", ""),
        method.get("vak", ""),
        method.get("doelgroep", ""),
        method.get("leerdoel", ""),
        method.get("beschrijving", ""),
        " ".join(method.get("stappen", [])),
        " ".join(method.get("materialen", [])),
    ]
    return " ".join(part.strip() for part in parts if part).strip()



def format_method_for_input(method: Dict) -> str:
    stappen = "\n".join(f"- {step}" for step in method.get("stappen", []))
    materialen = ", ".join(method.get("materialen", []))
    return (
        f"Titel: {method.get('titel', '')}\n"
        f"Vak: {method.get('vak', '')}\n"
        f"Doelgroep: {method.get('doelgroep', '')}\n"
        f"Leerdoel: {method.get('leerdoel', '')}\n\n"
        f"Beschrijving:\n{method.get('beschrijving', '')}\n\n"
        f"Stappen:\n{stappen}\n\n"
        f"Materialen:\n{materialen}"
    )



def classify_score(score: float) -> str:
    if score >= 0.75:
        return "Waarschijnlijk duplicaat"
    if score >= 0.50:
        return "Mogelijk vergelijkbaar"
    return "Waarschijnlijk uniek"



def badge_class(score: float) -> str:
    if score >= 0.75:
        return "badge-high"
    if score >= 0.50:
        return "badge-mid"
    return "badge-low"



def advice_text(score: float) -> str:
    if score >= 0.75:
        return "De ingevoerde lesmethode vertoont sterke overlap met een bestaand voorbeeld. Een inhoudelijke controle of samenvoeging ligt voor de hand."
    if score >= 0.50:
        return "Er zijn duidelijke overeenkomsten gevonden. Een docent of beheerder kan beoordelen of het om een variant of een duplicaat gaat."
    return "De ingevoerde lesmethode wijkt voldoende af van de bestaande voorbeelden en lijkt binnen deze demo uniek."



def compare_methods(query: str, dataset: List[Dict], top_k: int = 5) -> pd.DataFrame:
    corpus_texts = tuple(normalize_text(item) for item in dataset)
    vectorizer, corpus_matrix = fit_vectorizer(corpus_texts)
    query_vector = vectorizer.transform([query])
    scores = cosine_similarity(query_vector, corpus_matrix)[0]

    rows = []
    for item, score in zip(dataset, scores):
        rows.append(
            {
                "titel": item.get("titel", "Onbekend"),
                "vak": item.get("vak", "-"),
                "doelgroep": item.get("doelgroep", "-"),
                "leerdoel": item.get("leerdoel", "-"),
                "beschrijving": item.get("beschrijving", ""),
                "score": float(score),
                "beoordeling": classify_score(float(score)),
            }
        )

    return pd.DataFrame(rows).sort_values("score", ascending=False).head(top_k)



def result_card(row: pd.Series, rank: int):
    score_pct = max(0, min(100, row["score"] * 100))
    st.markdown(
        f"""
        <div class="result-card">
            <div class="result-header">
                <div class="result-name-wrap">
                    <div class="result-rank">{rank}</div>
                    <div>
                        <div class="result-title">{html.escape(str(row['titel']))}</div>
                        <div class="result-meta">{html.escape(str(row['vak']))} · {html.escape(str(row['doelgroep']))}</div>
                    </div>
                </div>
                <span class="badge {badge_class(float(row['score']))}">{html.escape(str(row['beoordeling']))}</span>
            </div>
            <div class="scoreline">
                <span>Overeenkomstscore</span>
                <strong>{row['score']:.3f}</strong>
            </div>
            <div class="progress-shell"><div class="progress-bar" style="width:{score_pct:.1f}%"></div></div>
            <div class="result-snippet"><strong>Beschrijving:</strong> {html.escape(str(row['beschrijving']))}<br><br><strong>Leerdoel:</strong> {html.escape(str(row['leerdoel']))}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


methods = load_data()
method_titles = [m["titel"] for m in methods]

st.markdown(
    f"""
    <div class="topbar">
        <div class="brand">
            <div class="brand-icon">AI</div>
            <div>
                <div class="brand-title">Lesmethode Analyse</div>
                <div class="brand-sub">Prototype voor duplicatiedetectie van lesmethodes</div>
            </div>
        </div>
        <div class="top-pill">{len(methods)} voorbeeldlesmethodes beschikbaar</div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.markdown(
    """
    <div class="hero-shell">
        <div class="hero-grid">
            <div>
                <div class="hero-eyebrow">AI-ondersteunde controle</div>
                <h1 class="hero-title">Ontdek snel of een lesmethode lijkt op bestaand lesmateriaal</h1>
                <div class="hero-copy">
                    Deze demonstratie vergelijkt een ingevoerde lesmethode met bestaande voorbeelden en toont welke methodes inhoudelijk het meest overeenkomen.
                    Zo ontstaat snel inzicht in mogelijke overlap, hergebruik of duplicatie.
                </div>
                <div class="chip-row">
                    <div class="chip">Inhoudelijke vergelijking</div>
                    <div class="chip">Directe score</div>
                    <div class="chip">Ondersteunend advies</div>
                </div>
            </div>
            <div class="hero-stat-card">
                <div class="hero-stat-label">Analyse in één oogopslag</div>
                <div class="hero-stat-value">Topmatches</div>
                <div class="hero-stat-sub">
                    Het systeem rangschikt de meest vergelijkbare lesmethodes en geeft per resultaat een duidelijke interpretatie van de overeenkomst.
                </div>
            </div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

left, right = st.columns([1.55, 0.85], gap="large")

with left:
    st.markdown('<div class="panel">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">Lesmethode invoeren</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="section-copy">Selecteer een voorbeeldlesmethode of voer hieronder een eigen beschrijving in. De analyse vergelijkt deze invoer met de voorbeelden uit deze demonstratie.</div>',
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns([1.2, 0.8])
    with c1:
        selected_title = st.selectbox(
            "Kies een voorbeeld",
            options=["-- Kies een voorbeeld --"] + method_titles,
        )
    with c2:
        top_k = st.slider("Aantal resultaten", min_value=3, max_value=8, value=5)

    default_text = ""
    if selected_title != "-- Kies een voorbeeld --":
        selected_method = next(m for m in methods if m["titel"] == selected_title)
        default_text = format_method_for_input(selected_method)

    st.markdown('<div class="input-shell">', unsafe_allow_html=True)
    query_text = st.text_area(
        "Lesmethode invoer",
        value=default_text,
        height=360,
        placeholder=(
            "Bijvoorbeeld:\n"
            "Titel: Debat over klimaatverandering\n"
            "Vak: Aardrijkskunde\n"
            "Doelgroep: Havo 4\n"
            "Leerdoel: Leerlingen onderbouwen een standpunt met argumenten.\n\n"
            "Beschrijving:\n"
            "Leerlingen analyseren bronnen over klimaatverandering en voeren daarna in groepjes een debat."
        ),
    )
    st.markdown(
        '<div class="input-caption">Neem bij voorkeur titel, vak, doelgroep, leerdoel, beschrijving en eventueel stappen of materialen op. Een completere invoer geeft doorgaans een betrouwbaarder resultaat.</div>',
        unsafe_allow_html=True,
    )
    st.markdown('</div>', unsafe_allow_html=True)

    b1, b2 = st.columns(2)
    with b1:
        detect = st.button("Analyse uitvoeren", use_container_width=True, type="primary")
    with b2:
        reset = st.button("Invoer wissen", use_container_width=True)

    if reset:
        st.rerun()

    st.markdown('</div>', unsafe_allow_html=True)

with right:
    st.markdown('<div class="panel panel-tight">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">Interpretatie</div>', unsafe_allow_html=True)
    st.markdown('<div class="section-copy">De overeenkomstscore helpt om te bepalen of een lesmethode vermoedelijk uniek is of sterk lijkt op bestaand materiaal.</div>', unsafe_allow_html=True)
    st.markdown(
        """
        <div class="legend-row">
            <div class="legend-item">
                <div class="legend-dot" style="background:#22c55e"></div>
                <div>
                    <div class="legend-title">0.75 of hoger</div>
                    <div class="legend-copy">Waarschijnlijk duplicaat. De overlap is groot en verdient een inhoudelijke controle.</div>
                </div>
            </div>
            <div class="legend-item">
                <div class="legend-dot" style="background:#f59e0b"></div>
                <div>
                    <div class="legend-title">0.50 t/m 0.74</div>
                    <div class="legend-copy">Mogelijk vergelijkbaar. Er zijn duidelijke overeenkomsten, maar beoordeling blijft nodig.</div>
                </div>
            </div>
            <div class="legend-item">
                <div class="legend-dot" style="background:#94a3b8"></div>
                <div>
                    <div class="legend-title">Lager dan 0.50</div>
                    <div class="legend-copy">Waarschijnlijk uniek. De invoer wijkt voldoende af van de beschikbare voorbeelden.</div>
                </div>
            </div>
        </div>
        <div class="mini-grid">
            <div class="mini-card">
                <div class="mini-label">Doel van deze demo</div>
                <div class="mini-value">Signaleren</div>
                <div class="mini-sub">De uitkomst ondersteunt beoordeling, maar vervangt geen inhoudelijke controle door een docent.</div>
            </div>
            <div class="mini-card">
                <div class="mini-label">Output</div>
                <div class="mini-value">Top {len(methods) if len(methods) < 8 else 8}</div>
                <div class="mini-sub">De meest vergelijkbare lesmethodes worden gerangschikt op basis van overeenkomst.</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown('</div>', unsafe_allow_html=True)

if detect:
    if not query_text.strip():
        st.warning("Voer eerst een lesmethode in om de analyse uit te voeren.")
    else:
        with st.spinner("Analyse wordt uitgevoerd..."):
            results_df = compare_methods(query_text, methods, top_k=top_k)

        best = results_df.iloc[0]
        avg_score = results_df["score"].mean()
        duplicate_count = int((results_df["score"] >= 0.75).sum())

        st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
        m1, m2, m3, m4 = st.columns(4)

        metrics = [
            ("Beste match", str(best["titel"]), "Hoogste overeenkomst binnen de voorbeelden"),
            ("Hoogste score", f"{best['score']:.3f}", "Mate van inhoudelijke overeenkomst"),
            ("Gemiddelde score", f"{avg_score:.3f}", f"Gemiddelde van top {top_k} resultaten"),
            ("Sterke matches", str(duplicate_count), "Aantal resultaten met score van 0.75 of hoger"),
        ]

        for col, (label, value, sub) in zip([m1, m2, m3, m4], metrics):
            with col:
                st.markdown(
                    f"""
                    <div class="mini-card">
                        <div class="mini-label">{html.escape(label)}</div>
                        <div class="mini-value">{html.escape(value)}</div>
                        <div class="mini-sub">{html.escape(sub)}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

        res_col, advice_col = st.columns([1.45, 0.8], gap="large")
        with res_col:
            st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)
            st.markdown('<div class="section-title">Meest vergelijkbare lesmethodes</div>', unsafe_allow_html=True)
            st.markdown('<div class="section-copy">Onderstaande resultaten zijn gerangschikt van hoog naar laag op basis van overeenkomst met de ingevoerde lesmethode.</div>', unsafe_allow_html=True)
            for idx, (_, row) in enumerate(results_df.iterrows(), start=1):
                result_card(row, idx)

        with advice_col:
            st.markdown("<div style='height:1rem'></div>", unsafe_allow_html=True)
            st.markdown(
                f"""
                <div class="system-advice">
                    <div class="advice-label">Advies van het systeem</div>
                    <div class="advice-title">{html.escape(str(best['beoordeling']))}</div>
                    <div class="advice-copy">{html.escape(advice_text(float(best['score'])))}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            st.markdown("<div style='height:.75rem'></div>", unsafe_allow_html=True)
            st.markdown('<div class="subtle-card">', unsafe_allow_html=True)
            st.markdown('<div class="section-title" style="font-size:1rem; margin-bottom:.4rem;">Aanbevolen vervolgstap</div>', unsafe_allow_html=True)
            if float(best['score']) >= 0.75:
                next_step = "Vergelijk de gevonden lesmethode inhoudelijk met de invoer en beoordeel of samenvoegen, hergebruik of verwijzing wenselijk is."
            elif float(best['score']) >= 0.50:
                next_step = "Controleer of de overeenkomst vooral in onderwerp, leerdoel of aanpak zit en bepaal of dit een variant of duplicaat is."
            else:
                next_step = "De kans op duplicatie is beperkt. De lesmethode kan waarschijnlijk als afzonderlijk lesmateriaal worden beschouwd."
            st.markdown(f'<div class="section-copy" style="margin-bottom:0;">{html.escape(next_step)}</div>', unsafe_allow_html=True)
            st.markdown('</div>', unsafe_allow_html=True)

        with st.expander("Resultaten in tabelvorm"):
            table_df = results_df.copy()
            table_df["score"] = table_df["score"].map(lambda x: round(x, 3))
            st.dataframe(
                table_df.rename(
                    columns={
                        "titel": "Titel",
                        "vak": "Vak",
                        "doelgroep": "Doelgroep",
                        "leerdoel": "Leerdoel",
                        "beschrijving": "Beschrijving",
                        "score": "Overeenkomstscore",
                        "beoordeling": "Beoordeling",
                    }
                ),
                use_container_width=True,
                hide_index=True,
            )

with st.expander("Beschikbare voorbeeldlesmethodes"):
    preview_df = pd.DataFrame(methods)[["titel", "vak", "doelgroep", "leerdoel"]]
    st.dataframe(preview_df, use_container_width=True, hide_index=True)

st.markdown('<div class="footer-note">Prototype voor demonstratie van duplicatiedetectie binnen lesmethodes.</div>', unsafe_allow_html=True)
