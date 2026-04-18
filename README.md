# Prototype duplicatiedetectie lesmethodes

Dit is een simpel demo-prototype voor het detecteren van mogelijke duplicaten in lesmethodes.

## Gebruikte techniek
- **Embeddings** met `sentence-transformers`
- **Cosine similarity** om overeenkomst tussen teksten te meten
- Fallback naar **TF-IDF + cosine similarity** als embeddings lokaal niet laden

## Wat de demo doet
Je voert een lesmethode in of kiest een voorbeeld. Daarna vergelijkt de app die invoer met bestaande lesmethodes en toont:
- de best passende lesmethodes
- een similarity score
- een label zoals `Waarschijnlijk duplicaat`

## Installatie
```bash
pip install -r requirements.txt
```

## Starten
```bash
streamlit run app.py
```

## Drempelwaarden in deze demo
- `>= 0.85` → waarschijnlijk duplicaat
- `0.70 - 0.84` → mogelijk vergelijkbaar
- `< 0.70` → waarschijnlijk uniek

## Opmerking
De eerste keer dat embeddings gebruikt worden, kan het model worden gedownload. Daarvoor is internet nodig.
