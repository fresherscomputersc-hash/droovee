import Link from "next/link";
import Image from "next/image";
import { CONTACT_WHATSAPP } from "@/lib/contact";
import { PublicShell } from "@/components/PublicShell";
import styles from "./launch.module.css";
import heroImg from "./hero.jpg";

/* Real quotes, trimmed, from src/app/testimonials/page.tsx (nothing invented). */
const REVIEWS = [
  {
    initials: "PD",
    name: "Priyanka Das",
    meta: "Saheed Nagar · Tata Nexon EV",
    quote:
      "“Multiple client meetings across Jaydev Vihar and Infocity. A professional chauffeur in my own car let me prep in the backseat — stress-free.”",
  },
  {
    initials: "SM",
    name: "Soumya Ranjan Mohapatra",
    meta: "Patia · Hyundai Creta",
    quote:
      "“Booked an outstation driver for a family trip to Puri and Konark. Fifteen minutes early, in uniform, and zero hidden charges.”",
  },
  {
    initials: "AP",
    name: "Dr. Alok Pattnaik",
    meta: "Khandagiri · Honda City",
    quote:
      "“A 4:30 AM airport drop, and the driver returned my car home safely. Perfect execution and real-time updates.”",
  },
];

const SYMBOL_PATHS: Record<string, React.ReactNode> = {
  "i-pin": (
    <>
      <path d="M20 10c0 5.2-8 12-8 12s-8-6.8-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.8" />
    </>
  ),
  "i-shield": <path d="M12 3.25 19 6v5.6c0 4.2-2.9 7.6-7 9.15-4.1-1.55-7-4.95-7-9.15V6l7-2.75Z" />,
  "i-driver": (
    <>
      <path d="M8.6 9.1V7.9a3.4 3.4 0 0 1 6.8 0v1.2" />
      <path d="M6.9 9.5c1.7-.55 3.4-.85 5.1-.85s3.4.3 5.1.85" />
      <path d="M4.4 9.3h15.2" />
      <circle cx="12" cy="14.4" r="2.5" />
      <path d="M6.8 21c.55-2.5 2.7-4.15 5.2-4.15S16.65 18.5 17.2 21" />
    </>
  ),
  "i-star": (
    <path d="m12 3.6 2.6 5.3 5.85.85-4.23 4.13 1 5.82L12 16.97l-5.22 2.73 1-5.82L3.55 9.75l5.85-.85L12 3.6Z" />
  ),
  "i-wa": (
    <>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.9c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45h.01c6.55 0 11.89-5.34 11.89-11.9 0-3.17-1.24-6.16-3.49-8.41Z" />
    </>
  ),
  "i-arrow": <path d="M4.5 12h15m-6.2-6.2 6.2 6.2-6.2 6.2" />,
  "i-lock": (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </>
  ),
  "i-chat": (
    <>
      <path d="M21 11.4a8.4 8.4 0 0 1-9 8.35 9.6 9.6 0 0 1-2.7-.5L4 21l1.6-4.3A8.2 8.2 0 0 1 3.6 11.4a8.4 8.4 0 0 1 8.7-8.4 8.4 8.4 0 0 1 8.7 8.4Z" />
      <path d="M9.4 8.6c.35-.06.55.02.7.33l.5 1.05c.1.22.06.42-.09.6l-.45.5c-.13.15-.14.3-.06.48.42.9 1.12 1.6 2.02 2.02.18.08.33.07.48-.06l.5-.45c.18-.15.38-.19.6-.09l1.05.5c.31.15.39.35.33.7-.13.72-.78 1.3-1.53 1.3-2.3 0-4.5-2.2-4.5-4.5 0-.75.58-1.4 1.3-1.53Z" />
    </>
  ),
  "i-calendar": (
    <>
      <rect x="3.6" y="5.4" width="16.8" height="15" rx="3" />
      <path d="M3.6 10.2h16.8M8.4 3.6v3.4M15.6 3.6v3.4" />
      <circle cx="8.6" cy="14.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="15.4" cy="14.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="8.6" cy="17.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.2" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  "i-chev": <path d="m9 18 6-6-6-6" />,
  "i-shield-check": (
    <>
      <path d="M12 3.25 19 6v5.6c0 4.2-2.9 7.6-7 9.15-4.1-1.55-7-4.95-7-9.15V6l7-2.75Z" />
      <path d="m8.9 11.9 2.1 2.1 4.1-4.3" />
    </>
  ),
  "i-car": (
    <>
      <path d="M4.2 16.4v1.7a1.2 1.2 0 0 0 1.2 1.2h1.2a1.2 1.2 0 0 0 1.2-1.2v-1.2M16.2 16.9v1.2a1.2 1.2 0 0 0 1.2 1.2h1.2a1.2 1.2 0 0 0 1.2-1.2v-1.7" />
      <path d="M4.2 16.9h15.6a1 1 0 0 0 1-1v-3a2 2 0 0 0-.9-1.7l-1.1-.7-1.4-3.3a2 2 0 0 0-1.8-1.2H8.4a2 2 0 0 0-1.8 1.2L5.2 10.5l-1.1.7a2 2 0 0 0-.9 1.7v3a1 1 0 0 0 1 1Z" />
      <path d="M6.6 10.4h10.8" />
      <circle cx="7.8" cy="13.6" r=".95" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="13.6" r=".95" fill="currentColor" stroke="none" />
    </>
  ),
  "i-rupee": (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.1 8h5.8M9.1 10.7h5.8M13.9 8c0 2.6-1.6 4.2-4.2 4.2H9.1l4.7 3.9" />
    </>
  ),
  "i-heart": (
    <path d="M12 20.1s-7.5-4.35-7.5-9.6a4.2 4.2 0 0 1 7.5-2.55A4.2 4.2 0 0 1 19.5 10.5c0 5.25-7.5 9.6-7.5 9.6Z" />
  ),
};

export default function LaunchPage() {
  return (
    <div className="launchPage">
    <PublicShell>
      <div className={styles.promo}>
      <div className={styles.inner}>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <defs>
            {Object.keys(SYMBOL_PATHS).map((id) => (
              <symbol key={id} id={`launch${id}`} viewBox="0 0 24 24">
                {SYMBOL_PATHS[id]}
              </symbol>
            ))}
          </defs>
        </svg>

        {/* ============ HERO ============ */}
        <section className={styles.hero}>
          <Image
            className={styles.heroPhoto}
            src={heroImg}
            alt="A Droovee chauffeur in uniform beside a white sedan"
            sizes="(max-width: 599px) 100vw, 520px"
            priority
          />
          <div className={styles.heroShade} />

          <div className={styles.heroInner}>
            <header className={styles.topbar}>
              <div className={styles.brand}>
                <Image
                  className={styles.logo}
                  src="/logo-reverse.png"
                  alt="Droovee"
                  width={600}
                  height={120}
                  priority
                />
                <span>DRIVERS ON DEMAND</span>
              </div>
              <div className={styles.place}>
                <svg><use href="#launchi-pin" /></svg>
                Bhubaneswar
              </div>
            </header>

            <h1 className={styles.heroHeadline}>
              Your first
              <br />
              hour is <em>on us.</em>
            </h1>
            <p className={styles.heroSub}>
              Professional drivers for your car,
              <br />
              anytime in Bhubaneswar.
            </p>

            <ul className={styles.proof}>
              <li className={styles.proofRow}>
                <span className={styles.proofTile}><svg><use href="#launchi-shield" /></svg></span>
                <span className={styles.proofTxt}>
                  Aadhaar, licence &
                  <br />
                  police verified
                </span>
              </li>
              <li className={styles.proofRow}>
                <span className={styles.proofTile}><svg><use href="#launchi-driver" /></svg></span>
                <span className={styles.proofTxt}>
                  Trained, uniformed
                  <br />
                  chauffeurs
                </span>
              </li>
              <li className={styles.proofRow}>
                <span className={styles.proofTile}><svg><use href="#launchi-star" /></svg></span>
                <span className={styles.proofTxt}>
                  <b>4.9★</b> from 1,000+
                  <br />
                  trips
                </span>
              </li>
            </ul>

            <div className={styles.offer}>
              <div className={styles.offerLeft}>
                <span className={styles.offerKicker}>FIRST HOUR</span>
                <span className={styles.offerFree}>FREE</span>
              </div>
              <div className={styles.offerDiv} />
              <div className={styles.offerRight}>
                <span className={styles.offerLabel}>Use code</span>
                <span className={styles.offerCode}>LAUNCH99</span>
                <span className={styles.offerTerms}>on your first Droovee booking</span>
              </div>
            </div>

            <Link className={styles.btnBook} href="/login?next=/book">
              <span>Book Now</span>
              <svg className={styles.btnArrow}><use href="#launchi-arrow" /></svg>
            </Link>

            <a className={styles.wa} href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer">
              <svg className={styles.waIco}><use href="#launchi-wa" /></svg>
              <span>Book via WhatsApp</span>
              <svg className={styles.waArrow}><use href="#launchi-arrow" /></svg>
            </a>

            <p className={styles.micro}>
              <svg><use href="#launchi-lock" /></svg>
              Quick reply <i>·</i> No app download <i>·</i> Secure & safe
            </p>
          </div>
        </section>

        {/* ============ SHEET ============ */}
        <section className={styles.sheet}>
          <h2 className={styles.sheetTitle}>How it works?</h2>

          <ol className={styles.steps}>
            <li className={styles.step}>
              <div className={styles.stepCircle}><svg><use href="#launchi-chat" /></svg></div>
              <span className={styles.stepBadge}>1</span>
              <div className={styles.stepCopy}>
                <h3 className={styles.stepTitle}>
                  Click Book
                  <br />
                  via WhatsApp
                </h3>
                <p className={styles.stepDesc}>Chat with our team</p>
              </div>
            </li>
            <li className={styles.chev} aria-hidden="true"><svg><use href="#launchi-chev" /></svg></li>
            <li className={styles.step}>
              <div className={styles.stepCircle}><svg><use href="#launchi-calendar" /></svg></div>
              <span className={styles.stepBadge}>2</span>
              <div className={styles.stepCopy}>
                <h3 className={styles.stepTitle}>Share your details</h3>
                <p className={styles.stepDesc}>
                  Date, time, location
                  <br />
                  & vehicle
                </p>
              </div>
            </li>
            <li className={styles.chev} aria-hidden="true"><svg><use href="#launchi-chev" /></svg></li>
            <li className={styles.step}>
              <div className={styles.stepCircle}><svg><use href="#launchi-driver" /></svg></div>
              <span className={styles.stepBadge}>3</span>
              <div className={styles.stepCopy}>
                <h3 className={styles.stepTitle}>
                  Get a professional
                  <br />
                  driver
                </h3>
                <p className={styles.stepDesc}>Sit back and relax</p>
              </div>
            </li>
          </ol>

          <ul className={styles.trust}>
            <li className={styles.trustItem}><svg><use href="#launchi-shield-check" /></svg><span>Verified<br />Drivers</span></li>
            <li className={styles.trustItem}><svg><use href="#launchi-car" /></svg><span>Clean &<br />Professional</span></li>
            <li className={styles.trustItem}><svg><use href="#launchi-rupee" /></svg><span>Transparent<br />Pricing</span></li>
            <li className={styles.trustItem}><svg><use href="#launchi-heart" /></svg><span>Loved by<br />1,000+ Customers</span></li>
          </ul>

          <section className={styles.reviews}>
            <h2 className={styles.reviewsTitle}>What our riders say</h2>
            <div className={styles.reviewList}>
              {REVIEWS.map((r) => (
                <article className={styles.review} key={r.name}>
                  <div className={styles.stars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i}><use href="#launchi-star" /></svg>
                    ))}
                  </div>
                  <p className={styles.reviewQuote}>{r.quote}</p>
                  <div className={styles.who}>
                    <span className={styles.avatar}>{r.initials}</span>
                    <span className={styles.whoTxt}>
                      <b>{r.name}</b>
                      <i>{r.meta}</i>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
      </div>
    </PublicShell>
    </div>
  );
}
