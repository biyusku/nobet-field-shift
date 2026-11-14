// Karşılama sayfası: ortalanmış başlık, tek çağrı düğmesi ve altta elle çizilmiş tarla manzarası.
import { useStore } from '../state';

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* pembe alt gölge */}
      <g fill="#f3c4d3">
        <ellipse cx="0" cy="14" rx="62" ry="16" />
        <ellipse cx="48" cy="12" rx="40" ry="13" />
        <ellipse cx="-50" cy="13" rx="34" ry="11" />
      </g>
      <g fill="#fff6f8">
        <ellipse cx="-6" cy="0" rx="40" ry="24" />
        <ellipse cx="34" cy="2" rx="32" ry="19" />
        <ellipse cx="-44" cy="6" rx="26" ry="14" />
        <ellipse cx="66" cy="8" rx="20" ry="10" />
        <ellipse cx="12" cy="-16" rx="24" ry="16" />
      </g>
    </g>
  );
}

function Pine({ x, y, s = 1, dark = false }: { x: number; y: number; s?: number; dark?: boolean }) {
  const a = dark ? '#2f6a3a' : '#4a8f3f';
  const b = dark ? '#255730' : '#3a7a36';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.5" y="-6" width="5" height="10" fill="#6b4a2e" />
      <path d="M0-58 16-26H-16Z" fill={a} />
      <path d="M0-44 21-10H-21Z" fill={b} />
      <path d="M0-58 0-10H-21L-16-26H-10Z" fill="#000" opacity=".1" />
    </g>
  );
}

function Bush({ x, y, s = 1, c = '#5f9a3c', d = '#4b8234' }: { x: number; y: number; s?: number; c?: string; d?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-3" y="-8" width="6" height="12" fill="#6b4a2e" />
      <ellipse cx="0" cy="-26" rx="26" ry="22" fill={d} />
      <ellipse cx="-12" cy="-30" rx="17" ry="15" fill={c} />
      <ellipse cx="10" cy="-36" rx="15" ry="13" fill={c} />
      <ellipse cx="2" cy="-22" rx="14" ry="10" fill={c} opacity=".7" />
    </g>
  );
}

function Landscape() {
  return (
    <svg viewBox="0 0 1200 460" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[60%] w-full" aria-hidden>
      <defs>
        <linearGradient id="gok" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8f9fb" stopOpacity="0" />
          <stop offset=".3" stopColor="#cfe6fb" stopOpacity=".85" />
          <stop offset=".75" stopColor="#8fc6f3" />
          <stop offset="1" stopColor="#a9d6f6" />
        </linearGradient>
        <linearGradient id="cayir" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b7d463" />
          <stop offset="1" stopColor="#86b446" />
        </linearGradient>
        <linearGradient id="oncayir" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9cc54f" />
          <stop offset="1" stopColor="#6f9f3a" />
        </linearGradient>
        <linearGradient id="sis" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".82" stopColor="#f8f9fb" stopOpacity="0" />
          <stop offset="1" stopColor="#f8f9fb" stopOpacity=".3" />
        </linearGradient>
      </defs>
      <rect width="1200" height="460" fill="url(#gok)" />

      <Cloud x={300} y={150} s={1.5} />
      <Cloud x={560} y={245} s={0.95} />
      <Cloud x={790} y={228} s={0.7} />
      <Cloud x={1050} y={200} s={1.05} />
      <Cloud x={95} y={250} s={0.85} />
      <Cloud x={1160} y={120} s={1.2} />

      {/* kuşlar */}
      <g fill="none" stroke="#3b4a63" strokeWidth="1.6" strokeLinecap="round">
        <path d="M250 232q5-5 9 0q4-5 9 0" />
        <path d="M352 268q4-4 7 0q3-4 7 0" />
        <path d="M912 172q4-4 7 0q3-4 7 0" />
        <path d="M168 205q3-3 6 0q3-3 6 0" />
      </g>

      {/* uzak dağlar */}
      <path d="M150 360 250 300 300 325 360 280 440 335 520 310 600 360Z" fill="#a8c6ea" />
      <path d="M360 280 378 296 366 300 352 292ZM250 300 262 312 250 314 240 308Z" fill="#fff" opacity=".9" />
      <path d="M0 372Q200 330 420 356T800 350Q1000 330 1200 352V460H0Z" fill="#9fcf9a" opacity=".75" />

      {/* arka tepe */}
      <path d="M0 400Q260 350 520 372Q760 392 960 330Q1090 292 1200 300V460H0Z" fill="url(#cayir)" />
      {/* ekili sıralar */}
      <g fill="none" stroke="#7fae45" strokeWidth="2" opacity=".55">
        <path d="M560 380Q780 388 960 340" />
        <path d="M600 396Q820 400 1010 346" />
        <path d="M650 412Q870 412 1070 352" />
        <path d="M720 428Q920 424 1130 362" />
      </g>

      {/* ahır */}
      <g transform="translate(1085 300)">
        <path d="M-58 2V-52L-8-92 70-78V2Z" fill="#a8523f" />
        <path d="M-8-92 70-78V2H-8Z" fill="#8f4435" />
        <path d="M-66-48-8-98 78-82 70-72-8-86-58-44Z" fill="#6c3a35" />
        <rect x="-44" y="-34" width="24" height="36" fill="#6c3a35" />
        <path d="M-44-34-20 2M-20-34-44 2" stroke="#c98a72" strokeWidth="2" />
        <rect x="20" y="-48" width="16" height="16" fill="#f2e3d0" />
        <path d="M-40-62h16v10h-16z" fill="#f2e3d0" />
      </g>

      <Pine x={985} y={318} s={0.75} />
      <Pine x={1010} y={322} s={0.6} dark />
      <Pine x={930} y={338} s={0.55} />

      {/* ön tepe */}
      <path d="M0 418Q180 396 380 414Q600 436 800 404Q1000 372 1200 392V460H0Z" fill="url(#oncayir)" />

      {/* sol: sonbahar ağaçları ve çalılar */}
      <Bush x={40} y={404} s={1.5} c="#e0934a" d="#c9742f" />
      <Bush x={118} y={414} s={1.1} c="#6aa544" d="#4f8a37" />
      <Bush x={8} y={432} s={1.2} c="#5f9a3c" d="#44792f" />
      <Pine x={200} y={420} s={0.5} />
      <Pine x={236} y={424} s={0.42} dark />
      <Bush x={300} y={422} s={0.6} c="#d98a3d" d="#bf6c2b" />

      {/* orta */}
      <Bush x={520} y={428} s={1.25} c="#5f9a3c" d="#44792f" />
      <Bush x={470} y={434} s={0.7} c="#e0934a" d="#c9742f" />
      <Pine x={410} y={428} s={0.5} />
      <Pine x={600} y={430} s={0.4} dark />

      {/* çiçekler ve ot */}
      <g fill="#fff">
        <circle cx="690" cy="436" r="2.2" /><circle cx="742" cy="428" r="2" /><circle cx="820" cy="422" r="2.2" />
        <circle cx="880" cy="430" r="2" /><circle cx="1010" cy="412" r="2.2" /><circle cx="1120" cy="418" r="2" />
        <circle cx="350" cy="440" r="2" /><circle cx="160" cy="444" r="2.2" />
      </g>
      <g fill="#f08aa6">
        <circle cx="770" cy="440" r="2.4" /><circle cx="930" cy="424" r="2.2" /><circle cx="1070" cy="430" r="2.4" /><circle cx="640" cy="446" r="2.2" />
      </g>
      <g stroke="#5c8f32" strokeWidth="1.6" strokeLinecap="round">
        <path d="M660 448l3-9M668 448l-1-10M705 444l3-8M845 438l3-9M853 438l-2-9M980 428l3-9M1100 430l3-9M430 446l3-9M90 450l3-9" />
      </g>
      <rect width="1200" height="460" fill="url(#sis)" />
    </svg>
  );
}

export function Landing() {
  const s = useStore();
  const w = s.weather;
  return (
    <div className="flex flex-col gap-4">
      <section className="hero relative min-h-[560px] overflow-hidden rounded-2xl border border-line sm:min-h-[620px]">
        <Landscape />
        <div className="relative z-10 mx-auto flex max-w-[760px] flex-col items-center px-5 pt-14 text-center sm:pt-20">
          <div className="hero-pill mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px]">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: '#2a78d6' }} />
            NASA POWER verisi · 2006–2025 · prototip
          </div>
          <h1 className="m-0 text-[36px] font-semibold leading-[1.08] tracking-tight sm:text-[58px]">
            <span className="hero-ink">Ürün önermiyoruz,</span>
            <br />
            <span className="hero-blue">su bütçesi yönetiyoruz</span>
          </h1>
          <p className="hero-sub mx-auto mb-0 mt-5 max-w-[520px] text-[15.5px] leading-relaxed">
            Kota, ekim planı, satış taahhüdü ve son 20 yılın gerçek havasında deneme: sulama kooperatifinin ziraat mühendisi için tek yerde.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              className="hero-cta cursor-pointer rounded-lg border-0 px-5 py-2.5 text-[14.5px] font-medium"
              onClick={() => {
                s.setTab('uye');
                window.scrollTo({ top: 0 });
              }}
            >
              Su bitiş tarihini gör
            </button>
          </div>
          <div className="hero-sub mt-3 text-[12px]">
            {w ? `İklim noktası: ${w.name}` : 'İklim verisi yükleniyor…'} · örnek kooperatif kurgusaldır
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { t: 'Su bitiş tarihi', d: 'Bugünkü ekimle kotanın hangi gün tükendiğini, 20 yılın aralığıyla birlikte gösterir.', tab: 'uye' as const, a: 'Üye ekranı' },
          { t: 'Taahhüdü dağıt', d: 'Satış taahhüdünü üyelere kota ve nöbet kurallarıyla dağıtır; tutmuyorsa seçenekleri ve bedellerini söyler.', tab: 'taahhut' as const, a: 'Taahhüt ekranı' },
          { t: 'Her sayının kaynağı', d: 'Ekrandaki her değer NASA verisi, hesap ya da varsayım diye etiketlidir. Gelir brüttür; veri yaklaşık 55 km çözünürlüklüdür.', tab: 'yontem' as const, a: 'Yöntem ve kaynaklar' },
        ].map((c) => (
          <section key={c.t} className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="m-0 text-[16px] font-semibold">{c.t}</h2>
            <p className="mb-3 mt-1.5 text-[13.5px] text-ink2">{c.d}</p>
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-[13.5px] font-medium text-water"
              onClick={() => {
                s.setTab(c.tab);
                window.scrollTo({ top: 0 });
              }}
            >
              {c.a} →
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}
