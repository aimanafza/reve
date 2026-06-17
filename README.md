# Commis
### Tailor-made, agreed on first.
---

## The Problem

Custom clothing fails before the needle ever touches fabric.

A client says *"something editorial, structured shoulders, low back, ivory silk."* The designer hears something slightly different. A garment gets made. The client is disappointed. Not because the craftsmanship was poor — because the gap between what the client imagined and what the designer understood was never actually closed.

The existing tools don't help. Email chains lose context. Pinterest boards are vague. Feedback like *"make it more blue"* on a PDF is useless. There's no shared visual workspace between the two people who need to agree most.

---

## The Solution

**Commis** is a collaborative design platform for tailor-made clothing. It gives clients a visual language to communicate with — and gives designers a Reve-powered editing environment to respond in — before a single stitch is made.

The flow:

1. **Customer describes the garment** — fabric, silhouette, occasion, budget. Uploads a fabric swatch photo.
2. **Designer generates photorealistic mockups** using the Reve 2.0 API, informed by the fabric reference.
3. **Customer annotates the mockup** — clicking directly on the neckline, waist, skirt, hem — and leaves zone-specific feedback.
4. **Designer edits with Reve** — selecting the exact region on the image, applying the edit with Reve's element-level editing. Only that zone changes. Everything else stays the same.
5. **Repeat until approval.** Sewing only starts when the customer confirms.

---

## Why Reve

Most image generation tools give you a new image every time you ask for a change. Reve 2.0 is different: it treats images as code, making each element individually addressable. When the designer edits the neckline, the skirt doesn't change. When the waist is adjusted, the fabric texture is preserved.

That's not just a technical detail — it's the entire product. Character and style consistency across iterations is what makes visual collaboration possible. Without it, every revision feels like starting over.

Reve 2.0 ranked **#2 on Arena's text-to-image leaderboard** (June 3, 2026), behind ChatGPT and ahead of Google — for a Palo Alto startup competing against the largest labs in the world.

---

## How It Works

```
Customer                          Designer
────────                          ────────
Describe garment + fabric photo → Designer sees brief
                                  ↓
                                  Generates mockup via Reve API
                                  (photorealistic, fabric-informed)
                                  ↓
Customer sees mockup    ←─────────
Clicks zone to annotate
(neckline / bodice / waist /
 skirt / sleeves / hem)
Types feedback
Sends to designer       ──────────→
                                  Designer clicks same zone
                                  on their canvas
                                  Drags to select region
                                  Types Reve prompt
                                  (pre-filled with customer note)
                                  Applies edit via Reve API
                                  Only that zone changes
                                  Shares revised mockup ──→
Customer approves ✓               
                                  Start sewing.
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS variables |
| Image generation | Reve 2.0 API (`reve/create-image`) |
| Image editing | Reve 2.0 API (`reve/edit-image`) |
| Deployment | Vercel |
| Fonts | Cormorant Garamond · DM Sans · JetBrains Mono |

All state is managed client-side with React `useState` — no database required for the demo. Frontend and backend (API routes) are deployed together on Vercel as a single Next.js application.

---

## Running Locally

```bash
git clone https://github.com/aimanafza/reve
cd reve
npm install
```

Add your Reve API key:
```bash
cp .env.local.example .env.local
# paste your key from api.reve.com/console
```

```bash
npm run dev
# → http://localhost:3000
```

**Pages:**
- `/` — Landing page
- `/commission/demo` — The full customer + designer split canvas

**API routes:**
- `POST /api/reve/generate` — calls `reve/create-image`
- `POST /api/reve/edit` — calls `reve/edit-image`

---

## Garment Zone Detection

Commis automatically detects which part of the garment the user clicked based on Y/X position as a percentage of image height:

| Zone | Y position | Notes |
|---|---|---|
| Neckline & shoulders | 0–12% | |
| Bodice & chest | 12–30% | |
| Sleeves & arms | 20–55%, x < 20% or x > 80% | edge regions |
| Waist & midsection | 30–45% | center |
| Skirt & hips | 45–70% | |
| Hem & length | 70–100% | |

Each zone has a pre-written Reve prompt template and zone-specific UI hints (e.g. neckline → *"e.g. lower V-neck, off-shoulder, sweetheart"*).
<img width="681" height="704" alt="Screenshot 2026-06-17 at 7 07 20 PM" src="https://github.com/user-attachments/assets/80896ef9-2f8d-48fb-b258-5ce795101b62" />
<img width="1462" height="692" alt="Screenshot 2026-06-17 at 7 06 55 PM" src="https://github.com/user-attachments/assets/7d9629f6-9913-43b5-88e3-7e04776dc1a2" />
<img width="1470" height="787" alt="Screenshot 2026-06-17 at 7 05 36 PM" src="https://github.com/user-attachments/assets/621b84e7-0ab2-46f1-ad7d-290331e749e6" />
